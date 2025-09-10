# WhatsApp Bot con Node.js y Twilio

Este es un proyecto MVP de un chatbot de WhatsApp para finanzas personales.

## Requisitos

- Node.js
- npm
- Una cuenta de Twilio
- ngrok

## Instalación

1.  Clona este repositorio o descarga los archivos.
2.  Navega a la carpeta del proyecto:
    ```bash
    cd whatsapp-bot
    ```
3.  Instala las dependencias:
    ```bash
    npm install
    ```

## Configuración

1.  Crea un archivo `.env` en la raíz del proyecto.
2.  Añade las siguientes variables de entorno al archivo `.env`:

    ```
    TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    TWILIO_AUTH_TOKEN=your_auth_token
    TWILIO_PHONE_NUMBER=whatsapp:+14155238886
    PORT=3000
    ```

    - Reemplaza `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` y `your_auth_token` con tus credenciales de Twilio.
    - El `TWILIO_PHONE_NUMBER` es el número de la sandbox de Twilio.

## Uso

1.  Inicia el servidor en modo de desarrollo:
    ```bash
    npm run dev
    ```
    El servidor se iniciará en `http://localhost:3000`.

2.  Expón tu servidor local a internet usando ngrok:
    ```bash
    ngrok http 3000
    ```
    ngrok te dará una URL pública (ej: `https://xxxx-xx-xx-xx-xx.ngrok.io`).

3.  Configura el webhook de Twilio:
    - Ve a tu [Consola de Twilio](https://www.twilio.com/console).
    - Navega a "Messaging" > "Try it out" > "Send a WhatsApp message".
    - En la sección "Sandbox settings", pega la URL de ngrok en el campo "WHEN A MESSAGE COMES IN", y añádele `/whatsapp`.
      Ejemplo: `https://xxxx-xx-xx-xx-xx.ngrok.io/whatsapp`
    - Asegúrate de que el método sea `HTTP POST`.
    - Guarda la configuración.

4.  Prueba el bot:
    - Envía un mensaje de WhatsApp con la palabra `hola` al número de la sandbox de Twilio.
    - Deberías recibir el menú de opciones como respuesta.





