FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./src /app/src
COPY ./src/local_model /app/src/local_model

EXPOSE 5000

CMD ["python", "/app/src/app.py"]