FROM --platform=linux/amd64 python:3.10

WORKDIR /app

COPY ./src /app/src
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "/app/src/app.py"]
