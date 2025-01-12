const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');  // Add Express
const app = express();


// MongoDB connection string
const mongoURI = 'mongodb+srv://nazakenyanetwork:jXQXcWO9OCkobI8H@kai-4o.v5w9u.mongodb.net/?retryWrites=true&w=majority&appName=kai-4o'; // Replace with your MongoDB connection string
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.log('MongoDB connection error:', error));

// Telegram API credentials
const apiId = 28205301;  // Replace with your actual API ID
const apiHash = 'Yb0fddf704ea08516edc1c7e83bc3728e';  // Replace with your actual API Hash

// MongoDB schema for storing bot data
const botSchema = new mongoose.Schema({
  botName: String,
  botUsername: String,
  botToken: String
});
const Bot = mongoose.model('Bot', botSchema);

// Load session string
const SESSION_FILE_PATH = path.join(__dirname, 'session.txt');
let sessionString = fs.readFileSync(SESSION_FILE_PATH, 'utf8').trim();
console.log('Session string loaded from file.');

async function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

async function run() {
  // Create a Telegram Client instance using the session
  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash);

  // Log client version
  console.log(`[Running gramJS version ${require('telegram/package').version}]`);

  try {
    // Ensure client is connected
    await client.connect();
    console.log('You are now connected.');

    // Fetch BotFather entity
    const botFather = await client.getEntity('BotFather');
    console.log('BotFather ID:', botFather.id);

    // Generate random bot name and username
    const botName = await generateRandomString(10);  // Name can be any length, 10 for example
    const botUsername = `${await generateRandomString(7)}bot`;  // Ensure username ends with 'bot'

    // Send /newbot command to BotFather
    await client.sendMessage(botFather, { message: `/newbot` });

    // Send the generated bot name and username
    await client.sendMessage(botFather, { message: botName });
    await client.sendMessage(botFather, { message: botUsername });

    // Capture the response and log it
    client.addEventHandler((event) => {
      if (event.message && event.message.text && event.message.text.includes('Congratulations on your new bot')) {
        console.log("Bot creation response:", event.message.text);
        
        const botToken = event.message.text.match(/(\d+:[\w-]+)/);
        if (botToken) {
          console.log('Bot API Token:', botToken[0]);
          
          // Save bot details to MongoDB
          const newBot = new Bot({
            botName,
            botUsername,
            botToken: botToken[0]
          });

          newBot.save()
            .then(() => console.log('Bot details saved to MongoDB'))
            .catch((error) => console.log('Error saving bot to MongoDB:', error));
        }
      }
    }, new TelegramClient.events.NewMessage({}));

  } catch (error) {
    console.error('Error during client connection or BotFather interaction:', error);
  }
}

app.get('/', (req, res) => {
  res.send('Telegram Bot Creator Running');
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

setInterval(() => {
    console.log('Starting bot creation process...');
    run();
  }, 120000);



