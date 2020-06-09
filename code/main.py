from flask import Flask
import os

app = Flask(__name__)

@app.route("/")
def hello_www():
    return "Busy website.. " + os.environ.get('ENV')
