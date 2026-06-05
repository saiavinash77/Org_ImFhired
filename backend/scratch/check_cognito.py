import boto3
from app.core.config import settings

def check_cognito():
    cognito = boto3.client(
        'cognito-idp',
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
    )
    
    try:
        resp = cognito.list_users(
            UserPoolId=settings.COGNITO_USER_POOL_ID,
            Limit=60
        )
        print(f"Users in Cognito Pool ({settings.COGNITO_USER_POOL_ID}):")
        for user in resp['Users']:
            email = next((attr['Value'] for attr in user['Attributes'] if attr['Name'] == 'email'), "No Email")
            print(f"- {email} (Status: {user['UserStatus']})")
            
        print(f"\nTotal users fetched: {len(resp['Users'])}")
    except Exception as e:
        print(f"Error checking Cognito: {e}")

if __name__ == "__main__":
    check_cognito()
