# Personal Finance WhatsApp Bot

## Project Overview

This is a **Personal Finance WhatsApp Bot**. It's designed to help users track their expenses through a simple conversational interface on WhatsApp. The bot is built using Node.js and relies on a few key external services to function.

## Core Technologies

*   **Node.js & Express:** The foundation of the bot is a web server built with Express, a popular Node.js framework. This server exposes a webhook that receives messages from WhatsApp.
*   **Twilio:** This is the service that connects your bot to the WhatsApp platform. When a user sends a message to your bot's number, Twilio forwards it to your Express server. When your bot wants to send a reply, it sends the message back to Twilio, which then delivers it to the user.
*   **Supabase:** This is your backend database. All the expense data is stored in a Supabase project. The bot interacts with Supabase to save, retrieve, update, and delete expenses.
*   **dotenv:** This is a utility to manage environment variables. It allows you to keep your secret keys (for Twilio and Supabase) out of your main codebase by storing them in a `.env` file.

## How It Works: The Conversation Flow

The bot uses a **state machine** to manage conversations. This means it keeps track of where each user is in a conversation. This is managed by an in-memory object called `userSessions`.

Here’s a step-by-step of a typical interaction:

1.  **User Sends a Message:** A user sends a message to the bot's WhatsApp number (e.g., "menu").
2.  **Twilio Forwards the Message:** Twilio receives this message and sends a `POST` request to the `/whatsapp` endpoint on your Express server.
3.  **Session Management:** The bot checks if there's an existing session for this user (identified by their phone number). If not, it creates a new one.
4.  **Stateful Logic:** The bot looks at the user's current "state" to understand the context of the message.
    *   If the user has no state (i.e., they're at the beginning of a conversation), it will treat "menu" as a command to show the main menu.
    *   If the user is in the middle of adding an expense (e.g., the state is `awaiting_expense_amount`), it will interpret the message as the expense amount.
5.  **Database Interaction:** Based on the user's message and state, the bot might need to interact with the Supabase database. For example, if the user provides all the necessary information for an expense, the bot will run an `insert` query to save it.
6.  **Sending a Reply:** The bot constructs a reply message (or multiple messages).
7.  **Twilio Delivers the Reply:** The bot sends the reply back to Twilio, which then forwards it to the user's WhatsApp.

## Key Features Implemented

*   **Add Expense:** A step-by-step process where the bot asks for the currency, amount, and category of an expense.
*   **Quick Add Expense:** A shortcut where users can type something like "25 food," and the bot will automatically categorize and save the expense.
*   **Analyze Expenses:** Users can ask for a summary of their spending over different time periods (e.g., current week, current month, etc.). This includes a "deep analysis" that shows the top spending categories and days.
*   **Delete/Modify Expenses:** Users can view their recent expenses and choose to either delete an entry or modify its details (amount, currency, or category).
*   **State Management:** The bot can handle multiple users at once and remembers the context of each conversation.
*   **Cancellation:** Users can type "cancelar" at any point to exit the current process.



