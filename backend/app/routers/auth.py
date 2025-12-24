from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.core import security
from app.core.database import get_db

import logging

# Configure logging to write to a file
logging.basicConfig(
    filename='auth_debug.log', 
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.user.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = crud.user.get_user_by_username(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

@router.get("/users/me", response_model=schemas.user.User)
async def read_users_me(current_user: Annotated[models.user.User, Depends(get_current_user)]):
    return current_user

@router.post("/token", response_model=schemas.user.Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    logging.info(f"Login attempt for username: {form_data.username}")
    user = crud.user.get_user_by_username(db, username=form_data.username)
    
    if not user:
        logging.warning("User not found in DB")
    else:
        logging.info(f"User found. ID: {user.id}, Hash: {user.hashed_password}")
        try:
            is_valid = security.verify_password(form_data.password, user.hashed_password)
            logging.info(f"Password verification result: {is_valid}")
            if not is_valid:
                 logging.warning(f"Password mismatch. Input: {form_data.password}")
        except Exception as e:
            logging.error(f"Error during password verification: {e}")

    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=schemas.user.User)
def register_user(user: schemas.user.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.user.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user_username = crud.user.get_user_by_username(db, username=user.username)
    if db_user_username:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.user.create_user(db=db, user=user)
