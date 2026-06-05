import boto3
import os
from dotenv import load_dotenv

load_dotenv()

access_key = os.getenv("AWS_ACCESS_KEY_ID")
secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
bucket_name = "firedin-uploads-prod"

s3 = boto3.client(
    "s3",
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name="us-east-1"
)

try:
    loc = s3.get_bucket_location(Bucket=bucket_name)
    print(f"Bucket {bucket_name} location: {loc}")
except Exception as e:
    print(f"Error checking {bucket_name}: {e}")
