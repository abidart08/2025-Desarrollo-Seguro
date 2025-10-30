import pytest
import requests
from requests.utils import unquote

from test_security import setup_create_user

#URL base del backend
BASE_URL = "http://localhost:5000"

#Se crea un usuario y se autentica para devolver un token válido
@pytest.fixture
def authenticated_user(setup_create_user):
    username, password = setup_create_user
    
    #Se realiza un POST al endpoint de login con las credenciales recibidas
    response = requests.post(f"{BASE_URL}/auth/login", 
                            json={"username": username, "password": password})
    assert response.status_code == 200

    #Se extrae el token de la respuesta JSON que nos devuelve el servidor y se retorna
    token = response.json()["token"]
    return token


#Test para verificar que no se pueda hacer SQL Injection
def test_sql_injection(authenticated_user):
    token = authenticated_user
    headers = {"Authorization": f"Bearer {token}"}
    
    #Se define una lista de payloads maliciosos comunes para SQL Injection
    malicious_payloads = [
        "' OR 1=1--",
        "' OR '1'='1",
        "' OR '1'='1' --",
        "' UNION SELECT * FROM users--",
        "'; DROP TABLE invoices--",
        "OR pg_sleep--",
    ]
    #Se define palabras claves de algunos de los mensajes que pueden indicar exposición de errores SQL
    SQL_ERROR_SIGNS = ["syntax error", "sql", "mysql", "pg_", "syntaxexception", "exception", "stacktrace"]
    
    #Se itera sobre cada la lista definida de payloads maliciosos
    for payload in malicious_payloads:
        response = requests.get(f"{BASE_URL}/invoices", 
                               headers=headers,
                               params={"status": payload, "operator": "="})
        
        assert response.status_code == 200
        
        #Verificamos que la respuesta no contenga indicios de errores SQL
        text = ""
        try:
            text = response.text.lower()
        except Exception:
            text = ""
        for sig in SQL_ERROR_SIGNS:
            assert sig not in text, f"Respuesta contiene indicios de error SQL para payload: {payload}"

        #Si respuesta es 200, verificar que el JSON devuelto no es un error ni datos inesperados
        if response.status_code == 200:
            try:
                data = response.json()
            except ValueError:
                pytest.fail(f"Payload {payload} devolvió 200 pero no es JSON válido")
            assert isinstance(data, list), f"Payload {payload} devolvió 200 pero el JSON no es una lista"