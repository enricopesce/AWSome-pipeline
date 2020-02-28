from flask import Flask
import os

app = Flask(__name__)

@app.route("/")
def hello_www():
    return "AWSome service delivered on " +  os.environ['ENV'] + " environment"