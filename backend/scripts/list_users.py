import os
from dotenv import load_dotenv
load_dotenv()
from pymongo import MongoClient

mongo_uri = os.getenv('MONGO_URI')
if not mongo_uri:
    print('MONGO_URI not set in environment')
    raise SystemExit(1)

client = MongoClient(mongo_uri)
db = client['adaa_db']
print('Users in DB:')
for u in db.users.find({}, {'_id': 0}):
    print(u)
