import os
import json
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timedelta
from flask import Flask, jsonify, render_template, request, abort, session
from dotenv import load_dotenv
import google.generativeai as genai
from bs4 import BeautifulSoup
from flask_talisman import Talisman
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.exceptions import HTTPException
import bleach
import secrets
import uuid

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
handler = RotatingFileHandler('app.log', maxBytes=100000, backupCount=3)
formatter = logging.Formatter('%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]')
handler.setFormatter(formatter)
logger.addHandler(handler)

# Load environment variables
load_dotenv()

# Flask secret key for session management
FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY")
if not FLASK_SECRET_KEY:
    FLASK_SECRET_KEY = secrets.token_hex(32)
    logger.exception("Warning: Using a generated secret key. Set FLASK_SECRET_KEY in .env for persistence.")

# Flask app and configuration of secure settings
app = Flask(__name__)
app.config.update(
    SECRET_KEY=FLASK_SECRET_KEY,
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    DEBUG=False,
    PERMANENT_SESSION_LIFETIME=timedelta(minutes=15)
)

# HTTPS and Secure Headers
csp = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "https://cdnjs.cloudflare.com"],
    'style-src': ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
    'font-src': ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
    'img-src': ["'self'", "data:"]
}
Talisman(app, content_security_policy=csp)

# Set up rate limiting to protect endpoints
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"]
)

# Load Gemini API key from environment variables
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GENAI_API_KEY:
    logger.error("GEMINI_API_KEY is not set in environment variables.")
    raise RuntimeError("Missing GEMINI_API_KEY environment variable.")

# AI Client configuration
genai.configure(api_key=GENAI_API_KEY)

# Sessions
@app.before_request
def set_session_id_and_permanent():
    session.permanent = True
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
        logger.info("New session id: %s", session['session_id'])

# -------------------------------------------
# Helper: Extract text from HTML
# -------------------------------------------
def extract_text_from_html(html_content: str) -> str:
    soup = BeautifulSoup(html_content, "html.parser")
    for tag in soup(["script", "style"]):
        tag.decompose()
    text = soup.get_text(separator="\n")
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return " ".join(lines)

# -------------------------------------------
# Input validation and sanitization
# -------------------------------------------
def validate_and_sanitize_input(user_input: str) -> str:
    sanitized = bleach.clean(user_input, tags=[], attributes={}, strip=True)
    if len(sanitized) > 500:
        sanitized = sanitized[:500]
    return sanitized

# -------------------------------------------
# HTTPS enforcement
# -------------------------------------------
@app.before_request
def enforce_https():
    if not (request.is_secure or request.headers.get('X-Forwarded-Proto', 'http') == 'https'):
        return jsonify({"error": "HTTPS is required for this endpoint."}), 403

# -------------------------------------------
# Error handler: Avoid leaking sensitive error details
# -------------------------------------------
@app.errorhandler(Exception)
def handle_exception(e):
    logger.exception("An error occurred: %s", e)
    if isinstance(e, HTTPException):
        return jsonify({"error": e.description}), e.code
    return jsonify({"error": "An internal error occurred."}), 500

# -------------------------------------------
# Routes
# -------------------------------------------
@app.route("/")
@limiter.exempt
def home():
    return render_template("index.html")

@app.route("/summarize-local", methods=["GET"])
@limiter.limit("10 per minute")
def summarize_local():
    try:
        html_path = os.path.join(app.root_path, "templates", "index.html")
        with open(html_path, "r", encoding="utf-8") as f:
            html_content = f.read()

        extracted_text = extract_text_from_html(html_content)

        model = genai.GenerativeModel("gemini-2.0-flash-thinking-exp-01-21")
        prompt = f"""
        You are an AI assistant on a data scientist portfolio website. 
        You need to summarize his website for the section 'About Me'.
        Output summary must include only professional information and exclude personal details.
        Also, it must include only summary text that is suitable for a portfolio website.
        Focus on AI and Data Science experience and current projects.
        Output must be cleaned text without any markdowns.

        ### Text from website
        {extracted_text}
        
        ### Summary:
        """
        response = model.generate_content(prompt)
        return jsonify({"summary": response.text})
    except Exception as e:
        logger.exception("Error in summarize_local: %s", e)
        return jsonify({"error": "Unable to process the summary request."}), 500
    
@app.route("/ask", methods=["POST"])
@limiter.limit("20 per minute")
def ask():
    try:
        html_path = os.path.join(app.root_path, "templates", "index.html")
        with open(html_path, "r", encoding="utf-8") as f:
            html_content = f.read()
        extracted_text = extract_text_from_html(html_content)

        data = request.get_json(force=True)
        question = data.get("question", "").strip()
        logger.exception(f"Got requested question {question}")

        if not question:
            return jsonify({"answer": question("Please, ask a question.")})

        chat_history = session.get("chat_history", "")

        question = validate_and_sanitize_input(question)

        prompt = f"""
        You are an AI assistant on a professional portfolio website.
        Answer the question based on the following information, context, question and history chat.
        Provide clean, plain text suitable for display on a website.
        The answer should be at least three complete sentences.
        If the question does not make sense or is not connected with the portfolio website owner, output 'I am sorry, I do not understand the question.'
        Also, you must to keep the context of the conversation with history chat for better reasoning and unredstanding based on previously asked questions.

        ### History Chat:
        {chat_history}

        ### Website Text:
        {extracted_text}

        ### User Question:
        {question}

        ### Answer:
        """
        model = genai.GenerativeModel("gemini-2.0-flash-thinking-exp-01-21")
        response = model.generate_content(prompt)
        answer = response.text.strip()

        new_history = f"User: {question}\nAssistant: {answer}\n"
        session['chat_history'] = chat_history + new_history

        return jsonify({"answer": answer})
    except Exception as e:
        logger.exception("Error in ask endpoint: %s", e)
        return jsonify({"error": answer("Unable to process your question.")}), 500

# -------------------------------------------
# Filtering middleware
# -------------------------------------------
class IPFilterMiddleware:
    def __init__(self, app, blocked_ips=None):
        self.app = app
        self.blocked_ips = blocked_ips or set()

    def __call__(self, environ, start_response):
        remote_addr = environ.get('REMOTE_ADDR', '')
        if remote_addr in self.blocked_ips:
            start_response('403 Forbidden', [('Content-Type', 'text/plain')])
            return [b'Forbidden']
        return self.app(environ, start_response)
    
blocked_ips = {"1.2.3.4"}
app.wsgi_app = IPFilterMiddleware(app.wsgi_app, blocked_ips=blocked_ips)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8443, threaded=True, ssl_context=('cert.pem', 'key.pem'))