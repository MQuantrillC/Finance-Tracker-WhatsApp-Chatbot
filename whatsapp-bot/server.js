require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = new twilio(accountSid, authToken);

// Supabase client (supports either server-style or NEXT_PUBLIC_* env names)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY).');
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Simple in-memory session management
const userSessions = {};

const CATEGORIES = [
    "🍔 Comida y Bebida",
    "🚕 Transporte",
    "🏠 Vivienda",
    "👕 Compras Personales",
    "💊 Salud",
    "🎉 Ocio y Entretenimiento",
    "📚 Educación",
    "💼 Trabajo / Negocio",
    "🎁 Otros"
];

const CATEGORY_KEYWORDS = {
    "🍔 Comida y Bebida": ["comida", "bebida", "restaurante", "almuerzo", "cena", "cafe", "bar", "supermercado", "mercado"],
    "🚕 Transporte": ["transporte", "taxi", "uber", "didi", "cabify", "pasaje", "bus", "gasolina", "combustible"],
    "🏠 Vivienda": ["vivienda", "alquiler", "renta", "hipoteca", "luz", "agua", "gas", "internet", "mantenimiento"],
    "👕 Compras Personales": ["compras", "ropa", "zapatos", "accesorios", "cuidado personal", "shopping"],
    "💊 Salud": ["salud", "farmacia", "doctor", "medico", "medicina", "hospital", "seguro"],
    "🎉 Ocio y Entretenimiento": ["ocio", "entretenimiento", "cine", "concierto", "fiesta", "salida", "juegos", "hobby"],
    "📚 Educación": ["educacion", "libros", "curso", "universidad", "colegio"],
    "💼 Trabajo / Negocio": ["trabajo", "negocio", "oficina", "herramientas", "equipo"],
    "🎁 Otros": ["otros", "regalo", "donacion", "varios"]
};

// Function to find a category based on keywords
const findCategory = (text) => {
    const cleanedText = text.toLowerCase().trim();
    for (const category in CATEGORY_KEYWORDS) {
        if (CATEGORY_KEYWORDS[category].some(keyword => cleanedText.includes(keyword))) {
            return category;
        }
    }
    return null;
};

// Helper function to get user_id from phone number
const getUserIdFromPhone = async (phone) => {
    // Format phone number to match Supabase entry if needed
    // Example: Twilio sends "whatsapp:+51...", Supabase might have "+51..."
    const cleanPhone = phone.replace('whatsapp:', '');
    const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('telefono', cleanPhone)
        .single();
    
    if (error) {
        console.log('Error fetching user by phone:', error.message);
        return null;
    }
    return data ? data.id : null;
};


app.get('/', (req, res) => {
    res.send('WhatsApp Bot funcionando 🚀');
});

app.post('/whatsapp', async (req, res) => {
    const twiml = new twilio.twiml.MessagingResponse();
    let messages = [];

    try {
        const incomingMsg = (req.body.Body || '').toLowerCase().trim();
        const from = req.body.From;

        if (!from) {
            console.error('Request received without a "From" number.');
            res.writeHead(400);
            return res.end();
        }
        
        const userId = await getUserIdFromPhone(from);

        if (!userId) {
            messages.push('Hola 👋. Para usar el bot, primero debes registrarte en nuestra aplicación web y vincular tu número de WhatsApp. ¡Te esperamos!');
            twiml.message(messages.join('\n\n'));
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            return res.end(twiml.toString());
        }

        // Foolproof session management: Ensure a session object exists for the user.
        if (!userSessions[from]) {
            userSessions[from] = {};
        }
        const session = userSessions[from];
        console.log(`[${from}] Session state: ${session.state || 'none'}, Message: "${incomingMsg}"`);


        // Universal cancel command, works at any state
        if (incomingMsg === 'cancelar') {
            if (session.state) {
                delete userSessions[from];
                messages.push('✅ Proceso cancelado. Escribe "menu" para empezar de nuevo.');
            } else {
                messages.push('No hay ningún proceso activo para cancelar. Escribe "menu" para ver las opciones.');
            }
        } else {
            // State machine for conversation flow
            switch (session.state) {
                case 'awaiting_currency':
                    const isPEN = incomingMsg.startsWith('1') || incomingMsg.includes('pen') || incomingMsg.includes('soles');
                    const isUSD = incomingMsg.startsWith('2') || incomingMsg.includes('usd') || incomingMsg.includes('dolar');

                    if (isPEN) {
                        session.currency = 'PEN';
                        session.state = 'awaiting_expense_amount';
                        messages.push('Por favor, introduce el monto del gasto (ej: 25.50)');
                    } else if (isUSD) {
                        session.currency = 'USD';
                        session.state = 'awaiting_expense_amount';
                        messages.push('Por favor, introduce el monto del gasto (ej: 25.50)');
                    } else {
                        messages.push("Opción no válida. Por favor, elige:\n1️⃣ PEN (Soles)\n2️⃣ USD (Dólares)\n\nO escribe 'cancelar' para salir.");
                    }
                    break;

                case 'awaiting_expense_amount':
                    // Clean the input to extract a valid number
                    const cleanedInput = incomingMsg.replace(/[^0-9.,]/g, '').replace(',', '.');
                    const amount = parseFloat(cleanedInput);
                    
                    if (!isNaN(amount) && amount > 0) {
                        session.amount = amount;
                        session.state = 'awaiting_category';
                        let categoryList = "Ahora, elige una categoría para tu gasto:\n";
                        CATEGORIES.forEach((cat, index) => {
                            categoryList += `${index + 1}️⃣ ${cat}\n`;
                        });
                        messages.push(categoryList);
                    } else {
                        messages.push('Monto no válido. Por favor, introduce solo el número (ej: 15.50).\n\nO escribe \'cancelar\' para salir.');
                    }
                    break;

                case 'awaiting_category':
                    const categoryIndex = parseInt(incomingMsg, 10) - 1;
                    if (categoryIndex >= 0 && categoryIndex < CATEGORIES.length) {
                        const { error } = await supabase
                            .from('expenses')
                            .insert({ 
                                user_id: userId, // USE THE FETCHED USER ID
                                amount: session.amount, 
                                currency: session.currency, 
                                category: CATEGORIES[categoryIndex]
                            });

                        if (error) {
                            console.error('Supabase insert error:', error);
                            messages.push('Hubo un error al guardar tu gasto. Por favor, intenta de nuevo.');
                        } else {
                            const currencySymbol = session.currency === 'PEN' ? 'S/' : '$';
                            messages.push(`✅ Gasto de ${currencySymbol}${session.amount.toFixed(2)} en "${CATEGORIES[categoryIndex]}" registrado correctamente.`);
                            messages.push(`Escribe "1" para añadir otro gasto o "menu" para volver al menú principal.`);
                        }
                        delete userSessions[from]; // End the session
                    } else {
                        messages.push("Categoría no válida. Por favor, elige un número de la lista.\n\nO escribe 'cancelar' para salir.");
                    }
                    break;

                case 'awaiting_cancellation_choice':
                    const choice = parseInt(incomingMsg, 10);
                    const sessionExpenses = session.expenses_to_cancel || [];

                    // Handle "Ver más"
                    if (choice === 11 && sessionExpenses.length === 10) {
                        const newOffset = (session.cancellation_offset || 0) + 10;
                        const { data, error } = await supabase
                            .from('expenses')
                            .select('id, created_at, amount, currency, category')
                            .eq('user_id', from)
                            .order('created_at', { ascending: false })
                            .range(newOffset, newOffset + 9);

                        if (error) {
                            console.error('Supabase select for cancel pagination error:', error);
                            messages.push('Hubo un error al obtener más gastos. Intenta de nuevo.');
                            delete userSessions[from];
                        } else if (data.length === 0) {
                            messages.push("No hay más gastos para mostrar. Aún puedes cancelar uno de la lista anterior.");
                        } else {
                            session.expenses_to_cancel = data;
                            session.cancellation_offset = newOffset;
                            
                            let expenseList = "Elige el número del gasto que quieres cancelar:\n\n";
                            data.forEach((exp, index) => {
                                 const date = new Date(exp.created_at);
                                 const formattedDate = `${date.toLocaleDateString('es-PE')} ${date.toLocaleTimeString('es-PE')}`;
                                 const currencySymbol = exp.currency === 'PEN' ? 'S/' : '$';
                                 expenseList += `${index + 1}️⃣ ${formattedDate} - ${currencySymbol}${exp.amount.toFixed(2)} - ${exp.category}\n`;
                            });
                            if (data.length === 10) {
                                expenseList += `\n*11*️⃣ Ver más gastos`;
                            }
                            expenseList += `\n\nEscribe 'menu' para volver al inicio.`;
                            messages.push(expenseList);
                        }
                    } else if (choice > 0 && choice <= sessionExpenses.length) {
                        const expenseToDelete = sessionExpenses[choice - 1];
                        
                        const { error } = await supabase
                            .from('expenses')
                            .delete()
                            .match({ id: expenseToDelete.id, user_id: from }); // Extra security

                        if (error) {
                            console.error('Supabase delete error:', error);
                            messages.push('Hubo un error al eliminar el gasto. Intenta de nuevo.');
                        } else {
                            const currencySymbol = expenseToDelete.currency === 'PEN' ? 'S/' : '$';
                            messages.push(`✅ Gasto de ${currencySymbol}${expenseToDelete.amount.toFixed(2)} en "${expenseToDelete.category}" eliminado correctamente.`);
                            messages.push(`Escribe "menu" para volver al inicio.`);
                        }
                        delete userSessions[from];
                    } else {
                        messages.push("Opción no válida. Por favor, elige un número de la lista, o '11' para ver más.\n\nEscribe 'menu' para salir.");
                    }
                    break;

                case 'awaiting_delete_or_modify_choice':
                    const deleteOrModifyChoice = parseInt(incomingMsg, 10);
                    if (deleteOrModifyChoice === 1) { // Borrar
                        // This reuses the logic from the "cancelar" implementation
                        session.cancellation_offset = 0;
                         const { data, error } = await supabase
                            .from('expenses')
                            .select('id, created_at, amount, currency, category')
                            .eq('user_id', from)
                            .order('created_at', { ascending: false })
                            .range(session.cancellation_offset, session.cancellation_offset + 9);
                        
                        if (error || data.length === 0) {
                            messages.push(error ? 'Hubo un error al obtener tus gastos.' : 'No tienes gastos para borrar.');
                            delete userSessions[from];
                        } else {
                            session.expenses_to_cancel = data;
                            let expenseList = "Elige el número del gasto que quieres *borrar*:\n\n";
                            data.forEach((exp, index) => {
                                 const date = new Date(exp.created_at);
                                 const formattedDate = `${date.toLocaleDateString('es-PE')} ${date.toLocaleTimeString('es-PE')}`;
                                 const currencySymbol = exp.currency === 'PEN' ? 'S/' : '$';
                                 expenseList += `${index + 1}️⃣ ${formattedDate} - ${currencySymbol}${exp.amount.toFixed(2)} - ${exp.category}\n`;
                            });
                            if (data.length === 10) expenseList += `\n*11*️⃣ Ver más gastos`;
                            expenseList += `\n\nEscribe 'menu' para volver al inicio.`;
                            messages.push(expenseList);
                            session.state = 'awaiting_cancellation_choice';
                        }
                    } else if (deleteOrModifyChoice === 2) { // Modificar
                        session.cancellation_offset = 0;
                         const { data, error } = await supabase
                            .from('expenses')
                            .select('id, created_at, amount, currency, category')
                            .eq('user_id', from)
                            .order('created_at', { ascending: false })
                            .range(session.cancellation_offset, session.cancellation_offset + 9);
                        
                        if (error || data.length === 0) {
                            messages.push(error ? 'Hubo un error al obtener tus gastos.' : 'No tienes gastos para modificar.');
                            delete userSessions[from];
                        } else {
                            session.expenses_to_modify = data;
                            let expenseList = "Elige el número del gasto que quieres *modificar*:\n\n";
                            data.forEach((exp, index) => {
                                 const date = new Date(exp.created_at);
                                 const formattedDate = `${date.toLocaleDateString('es-PE')} ${date.toLocaleTimeString('es-PE')}`;
                                 const currencySymbol = exp.currency === 'PEN' ? 'S/' : '$';
                                 expenseList += `${index + 1}️⃣ ${formattedDate} - ${currencySymbol}${exp.amount.toFixed(2)} - ${exp.category}\n`;
                            });
                            if (data.length === 10) expenseList += `\n*11*️⃣ Ver más gastos`;
                            expenseList += `\n\nEscribe 'menu' para volver al inicio.`;
                            messages.push(expenseList);
                            session.state = 'awaiting_modification_selection';
                        }
                    } else if (deleteOrModifyChoice === 3) { // Volver al menú
                         messages.push(`¡Hola! 👋 Elige una opción:\n1️⃣ Añadir gasto\n2️⃣ Analizar gastos\n3️⃣ Borrar o Modificar Gasto\n\nPuedes también registrar un gasto rápido escribiendo, por ejemplo: \`25 comida\``);
                         delete userSessions[from];
                    } else {
                        messages.push("Opción no válida. Elige (1) para borrar, (2) para modificar o (3) para volver al menú.");
                    }
                    break;

                case 'awaiting_modification_selection':
                    const modChoice = parseInt(incomingMsg, 10);
                    const expensesToModify = session.expenses_to_modify || [];
                    if (modChoice > 0 && modChoice <= expensesToModify.length) {
                        session.expense_to_modify = expensesToModify[modChoice - 1];
                        
                        const exp = session.expense_to_modify;
                        const currencySymbol = exp.currency === 'PEN' ? 'S/' : '$';
                        const formattedDate = new Date(exp.created_at).toLocaleDateString('es-PE');
                        const confirmationMsg = `Estas modificando el gasto:\n• ${formattedDate} - ${currencySymbol}${exp.amount.toFixed(2)} - ${exp.category}`;
                        
                        messages.push(confirmationMsg);
                        session.state = 'awaiting_modification_field';
                        messages.push(`\n¿Qué quieres modificar?\n1️⃣ Monto\n2️⃣ Moneda\n3️⃣ Categoría\n\nEscribe 'menu' para cancelar.`);
                    } else {
                         messages.push("Opción no válida. Por favor, elige un número de la lista.");
                    }
                    break;

                case 'awaiting_modification_field':
                    const fieldChoice = parseInt(incomingMsg, 10);
                    if (fieldChoice === 1) {
                        session.state = 'awaiting_new_amount';
                        messages.push("Por favor, introduce el nuevo monto (ej: 25.50).");
                    } else if (fieldChoice === 2) {
                        session.state = 'awaiting_new_currency';
                        messages.push("Elige la nueva moneda:\n1️⃣ PEN (Soles)\n2️⃣ USD (Dólares)");
                    } else if (fieldChoice === 3) {
                        session.state = 'awaiting_new_category';
                        let categoryList = "Elige la nueva categoría:\n";
                        CATEGORIES.forEach((cat, index) => {
                            categoryList += `${index + 1}️⃣ ${cat}\n`;
                        });
                        messages.push(categoryList);
                    } else {
                        messages.push("Opción no válida. Elige 1, 2 o 3.");
                    }
                    break;

                case 'awaiting_new_amount':
                    const newAmount = parseFloat(incomingMsg.replace(/[^0-9.,]/g, '').replace(',', '.'));
                    if (!isNaN(newAmount) && newAmount > 0) {
                        const { data, error } = await supabase
                            .from('expenses')
                            .update({ amount: newAmount })
                            .match({ id: session.expense_to_modify.id })
                            .select();
                        
                        if (error || !data || data.length === 0) {
                             messages.push("Hubo un error al actualizar el monto.");
                        } else {
                             const updatedExp = data[0];
                             const currencySymbol = updatedExp.currency === 'PEN' ? 'S/' : '$';
                             const formattedDate = new Date(updatedExp.created_at).toLocaleDateString('es-PE');
                             const successMsg = `✅ Monto actualizado. El gasto ahora es:\n• ${formattedDate} - ${currencySymbol}${updatedExp.amount.toFixed(2)} - ${updatedExp.category}`;
                             messages.push(successMsg);
                        }
                        delete userSessions[from];
                    } else {
                        messages.push("Monto no válido. Por favor, introduce un número positivo.");
                    }
                    break;

                case 'awaiting_new_currency':
                    const newCurrencyChoice = incomingMsg.toLowerCase();
                    let newCurrency = null;
                    if (newCurrencyChoice.startsWith('1') || newCurrencyChoice.includes('pen')) {
                        newCurrency = 'PEN';
                    } else if (newCurrencyChoice.startsWith('2') || newCurrencyChoice.includes('usd')) {
                        newCurrency = 'USD';
                    }

                    if (newCurrency) {
                         const { data, error } = await supabase
                            .from('expenses')
                            .update({ currency: newCurrency })
                            .match({ id: session.expense_to_modify.id })
                            .select();
                        
                        if (error || !data || data.length === 0) {
                             messages.push("Hubo un error al actualizar la moneda.");
                        } else {
                             const updatedExp = data[0];
                             const currencySymbol = updatedExp.currency === 'PEN' ? 'S/' : '$';
                             const formattedDate = new Date(updatedExp.created_at).toLocaleDateString('es-PE');
                             const successMsg = `✅ Moneda actualizada. El gasto ahora es:\n• ${formattedDate} - ${currencySymbol}${updatedExp.amount.toFixed(2)} - ${updatedExp.category}`;
                             messages.push(successMsg);
                        }
                        delete userSessions[from];
                    } else {
                        messages.push("Opción no válida. Elige 1 o 2.");
                    }
                    break;

                case 'awaiting_new_category':
                    const newCategoryIndex = parseInt(incomingMsg, 10) - 1;
                    if (newCategoryIndex >= 0 && newCategoryIndex < CATEGORIES.length) {
                        const newCategory = CATEGORIES[newCategoryIndex];
                        const { data, error } = await supabase
                            .from('expenses')
                            .update({ category: newCategory })
                            .match({ id: session.expense_to_modify.id })
                            .select();

                         if (error || !data || data.length === 0) {
                             messages.push("Hubo un error al actualizar la categoría.");
                        } else {
                             const updatedExp = data[0];
                             const currencySymbol = updatedExp.currency === 'PEN' ? 'S/' : '$';
                             const formattedDate = new Date(updatedExp.created_at).toLocaleDateString('es-PE');
                             const successMsg = `✅ Categoría actualizada. El gasto ahora es:\n• ${formattedDate} - ${currencySymbol}${updatedExp.amount.toFixed(2)} - ${updatedExp.category}`;
                             messages.push(successMsg);
                        }
                        delete userSessions[from];
                    } else {
                        messages.push("Categoría no válida. Por favor, elige un número de la lista.");
                    }
                    break;

                case 'awaiting_analysis_timeframe':
                    const timeframeChoice = parseInt(incomingMsg, 10);
                    const timeFrameOptions = {
                        1: "de la semana actual",
                        2: "del mes actual",
                        3: "de hace 1 mes",
                        4: "de hace 3 meses",
                        5: "de hace 6 meses",
                        6: "de este año (YTD)",
                        7: "de hace 1 año"
                    };

                    if (timeframeChoice > 0 && timeframeChoice <= 7) {
                        const now = new Date();
                        let startDate = new Date();
                        let endDate = new Date(); // End date for the range
                        
                        // Set hours to 0 to get the beginning of the day
                        startDate.setHours(0, 0, 0, 0);

                        switch(timeframeChoice) {
                            case 1: // Current Week
                                startDate.setDate(now.getDate() - now.getDay());
                                break;
                            case 2: // Current Month
                                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                                break;
                            case 3: // 1 Month Ago
                                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                                break;
                            case 4: // 3 Months Ago
                                startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                                endDate = new Date(now.getFullYear(), now.getMonth() - 2, 0);
                                break;
                            case 5: // 6 Months Ago
                                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                                endDate = new Date(now.getFullYear(), now.getMonth() - 5, 0);
                                break;
                            case 6: // YTD
                                startDate = new Date(now.getFullYear(), 0, 1);
                                break;
                            case 7: // 1 Year Ago
                                startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                                break;
                        }
                        
                        session.analysis_start_date = startDate.toISOString();
                        session.analysis_end_date = endDate.toISOString();

                        const { data, error } = await supabase
                            .from('expenses')
                            .select()
                            .eq('user_id', from)
                            .gte('created_at', session.analysis_start_date)
                            .lte('created_at', session.analysis_end_date);
                        
                        if (error) {
                            console.error('Supabase select for analysis error:', error);
                            messages.push('Hubo un error al obtener tus gastos. Intenta de nuevo.');
                            delete userSessions[from];
                        } else if (data.length === 0) {
                            messages.push("No tienes gastos registrados en este período.");
                            delete userSessions[from];
                        } else {
                            session.analysis_data = data; // Save data for deep analysis
                            
                            const summary = { totalPEN: 0, totalUSD: 0, count: data.length };
                            data.forEach(exp => {
                                if (exp.currency === 'PEN') summary.totalPEN += exp.amount;
                                if (exp.currency === 'USD') summary.totalUSD += exp.amount;
                            });

                            let totalSpentString = "";
                            if (summary.totalPEN > 0) totalSpentString += `S/${summary.totalPEN.toFixed(2)}`;
                            if (summary.totalUSD > 0) {
                                if (totalSpentString.length > 0) totalSpentString += " y ";
                                totalSpentString += `$${summary.totalUSD.toFixed(2)}`;
                            }

                            const formattedStartDate = startDate.toLocaleDateString('es-PE');
                            const formattedEndDate = endDate.toLocaleDateString('es-PE');

                            let summaryMsg = `📊 *Resumen ${timeFrameOptions[timeframeChoice]}:*\n`;
                            summaryMsg += `(analizando del ${formattedStartDate} al ${formattedEndDate})\n\n`;
                            summaryMsg += `• *Total gastado:* ${totalSpentString || 'S/0.00'}\n`;
                            summaryMsg += `• *Nº de gastos registrados:* ${summary.count}\n\n`;
                            summaryMsg += `Elige una opción:\n*1*️⃣ Análisis profundo\n*2*️⃣ Volver al menú`;
                            messages.push(summaryMsg);

                            session.state = 'awaiting_deep_analysis_choice';
                        }
                    } else {
                        messages.push("Opción no válida. Por favor, elige un número de la lista (1-7).");
                    }
                    break;
                
                case 'awaiting_deep_analysis_choice':
                    const deepAnalysisChoice = parseInt(incomingMsg, 10);
                    if (deepAnalysisChoice === 1) {
                        const data = session.analysis_data || [];
                        
                        // Use a rough conversion for a unified total. PEN is base.
                        const getTotalInPEN = (exp) => exp.currency === 'USD' ? exp.amount * 3.8 : exp.amount;
                        const grandTotal = data.reduce((sum, exp) => sum + getTotalInPEN(exp), 0);

                        // Top spending category
                        const categoryTotals = data.reduce((acc, exp) => {
                            const totalInPEN = getTotalInPEN(exp);
                            acc[exp.category] = (acc[exp.category] || 0) + totalInPEN;
                            return acc;
                        }, {});
                        const topCategoryName = Object.keys(categoryTotals).reduce((a, b) => categoryTotals[a] > categoryTotals[b] ? a : b, 'N/A');
                        const topCategoryTotal = categoryTotals[topCategoryName] || 0;
                        const topCategoryPercent = grandTotal > 0 ? ((topCategoryTotal / grandTotal) * 100).toFixed(1) : 0;


                        // Top spending day
                        const dayTotals = data.reduce((acc, exp) => {
                            const day = new Date(exp.created_at).toLocaleDateString('es-PE');
                            const totalInPEN = getTotalInPEN(exp);
                            acc[day] = (acc[day] || 0) + totalInPEN;
                            return acc;
                        }, {});
                        const topDayDate = Object.keys(dayTotals).reduce((a, b) => dayTotals[a] > dayTotals[b] ? a : b, 'N/A');
                        const topDayTotal = dayTotals[topDayDate] || 0;
                        const topDayPercent = grandTotal > 0 ? ((topDayTotal / grandTotal) * 100).toFixed(1) : 0;


                        let deepAnalysisMsg = `🧠 *Análisis Profundo:*\n`;
                        deepAnalysisMsg += `\n*Categoría con más gastos:*\n• *${topCategoryName}* con un total de S/${topCategoryTotal.toFixed(2)} (${topCategoryPercent}% del total del periodo)\n`;
                        deepAnalysisMsg += `\n*Día con más gastos:*\n• *${topDayDate}* con un total de S/${topDayTotal.toFixed(2)} (${topDayPercent}% del total del periodo)\n`;
                        deepAnalysisMsg += `\nEscribe "menu" para volver al inicio.`;
                        
                        messages.push(deepAnalysisMsg);
                        delete userSessions[from];
                    } else if (deepAnalysisChoice === 2) {
                        messages.push(`¡Hola! 👋 Elige una opción:\n1️⃣ Añadir gasto\n2️⃣ Analizar gastos\n3️⃣ Cancelar gasto\n\nPuedes también registrar un gasto rápido escribiendo, por ejemplo: \`25 comida\``);
                        delete userSessions[from];
                    } else {
                        messages.push("Opción no válida. Elige (1) para análisis profundo o (2) para volver al menú.");
                    }
                    break;

                default: // No state, handle main menu commands
                    // Quick add feature: Check for a pattern like "50 comida" or "comida 50"
                    const quickAddMatch = incomingMsg.match(/^(?:(\d+(?:[.,]\d+)?)\s*(.+))|(?:(.+?)\s*(\d+(?:[.,]\d+)?))$/);

                    if (quickAddMatch) {
                        const amountStr = quickAddMatch[1] || quickAddMatch[4];
                        const categoryStr = quickAddMatch[2] || quickAddMatch[3];
                        
                        const amount = parseFloat(amountStr.replace(',', '.'));
                        const category = findCategory(categoryStr);

                        if (amount > 0 && category) {
                            const { error } = await supabase
                                .from('expenses')
                                .insert({ 
                                    user_id: userId, // USE THE FETCHED USER ID
                                    amount: amount, 
                                    currency: 'PEN', // Default to PEN for quick adds
                                    category: category
                                });

                            if (error) {
                                console.error('Supabase quick add error:', error);
                                messages.push('Hubo un error al guardar tu gasto. Por favor, intenta de nuevo.');
                            } else {
                                messages.push(`✅ Gasto rápido de S/${amount.toFixed(2)} en "${category}" registrado.`);
                                messages.push(`Escribe "1" para añadir otro gasto o "menu" para volver al menú principal.`);
                            }
                            delete userSessions[from]; // Clear session after quick add
                            break; // Exit the switch
                        }
                    }

                    // Regular menu options
                    const menuKeywords = ['hola', 'menu', 'inicio', 'empezar', 'start', 'hi', 'hello'];
                    if (menuKeywords.includes(incomingMsg)) {
                        messages.push(`¡Hola! 👋 Elige una opción:\n1️⃣ Añadir gasto\n2️⃣ Analizar gastos\n3️⃣ Borrar o Modificar Gasto\n\nPuedes también registrar un gasto rápido escribiendo, por ejemplo: \`25 comida\``);
                    } else if (incomingMsg === '1') {
                        session.state = 'awaiting_currency';
                        messages.push('¿En qué moneda fue el gasto?\n1️⃣ PEN (Soles)\n2️⃣ USD (Dólares)\n\nEscribe "cancelar" en cualquier momento para detener el proceso.');
                    } else if (incomingMsg === '2') {
                        session.state = 'awaiting_analysis_timeframe';
                        let timeFrameMenu = "Selecciona un período para analizar:\n";
                        timeFrameMenu += "1️⃣ Semana actual\n";
                        timeFrameMenu += "2️⃣ Mes actual\n";
                        timeFrameMenu += "3️⃣ Hace 1 mes\n";
                        timeFrameMenu += "4️⃣ Hace 3 meses\n";
                        timeFrameMenu += "5️⃣ Hace 6 meses\n";
                        timeFrameMenu += "6️⃣ Este año (YTD)\n";
                        timeFrameMenu += "7️⃣ Hace 1 año";
                        messages.push(timeFrameMenu);
                    } else if (incomingMsg === '3') {
                        session.state = 'awaiting_delete_or_modify_choice';
                        messages.push(`Elige una opción:\n1️⃣ Borrar Gasto\n2️⃣ Modificar Gasto\n3️⃣ Volver al menú`);
                    } else {
                        messages.push("No entendí 🤔. Escribe 'menu' para ver las opciones.");
                    }
                    break;
            }
        }
        
        for (const msg of messages) {
            twiml.message(msg);
        }
    } catch (error) {
        console.error('Unhandled error in /whatsapp endpoint:', error);
        twiml.message('Lo siento, ocurrió un error inesperado. Por favor, intenta de nuevo más tarde.');
    }
    
    console.log('Responding with TwiML:', twiml.toString());
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
