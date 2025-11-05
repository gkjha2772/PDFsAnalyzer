FROM --platform=linux/amd64 python:3.10

WORKDIR /app

COPY ./src /app/src
COPY ./Collection_1/ /app/Collection_1/
COPY ./Collection_2/ /app/Collection_2/
COPY ./Collection_3/ /app/Collection_3/
COPY requirements.txt /app/
COPY ./src/local_model /app/src/local_model

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "/app/src/app.py"]
