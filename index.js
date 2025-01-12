const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');

// Telegram API credentials
const apiId = 28205301;  // Replace with your actual API ID
const apiHash = 'Yb0fddf704ea08516edc1c7e83bc3728e';  // Replace with your actual API Hash

// MongoDB connection URI
const mongoURI = 'mongodb+srv://nazakenyanetwork:jXQXcWO9OCkobI8H@kai-4o.v5w9u.mongodb.net/?retryWrites=true&w=majority&appName=kai-4o';  // Replace with your MongoDB connection string

// MongoDB connection
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const BotSchema = new mongoose.Schema({
  botName: String,
  username: String,
  token: String,
});

const Bot = mongoose.model('Bot', BotSchema);

// Load session string
const SESSION_FILE_PATH = path.join(__dirname, 'session.txt');
let sessionString = fs.readFileSync(SESSION_FILE_PATH, 'utf8').trim();
console.log('Session string loaded from file.');

async function run() {
  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash);

  console.log(`[Running gramJS version ${require('telegram/package').version}]`);

  try {
    await client.connect();
    console.log('You are now connected.');

    // Fetch BotFather ID
    const botFather = await client.getEntity('BotFather');
    console.log('BotFather ID:', botFather.id);

    // Create new bots every minute
    setInterval(async () => {
      try {
        // Generate a unique bot name with only alphabetic characters ending with 'bot'
        const randomString = generateRandomString(6);  // Example: 'CHSisdijhwy'
        const botName = `${randomString}bot`;  // Ensure it ends with 'bot'
        const botUsername = `${randomString.toLowerCase()}bot`;  // Ensure the username ends with 'bot'

        console.log('Generated Bot Name:', botName);
        console.log('Generated Bot Username:', botUsername);

        // Send a command to BotFather to create a new bot
        console.log('Sending /newbot command to BotFather...');
        await client.sendMessage(botFather, { message: '/newbot' });
        console.log('Sent /newbot.');

        await client.sendMessage(botFather, { message: botName });
        console.log('Sent bot name:', botName);

        await client.sendMessage(botFather, { message: botUsername });
        console.log('Sent bot username:', botUsername);

        // Wait for a message from BotFather after creating the bot
        console.log('Waiting for BotFather response...');
        const message = await client.getMessages(botFather, { limit: 1, reverse: true });  // Get the most recent message

        console.log('Received message from BotFather:', message);

        if (message && message[0] && message[0].message.includes('Congratulations on your new bot')) {
          // Log the entire message from BotFather
          console.log('BotFather Message:', message[0].message);

          // Extract the token from the message
          const tokenRegex = /Use this token to access the HTTP API:\s([A-Za-z0-9_-]+)/;
          const tokenMatch = message[0].message.match(tokenRegex);

          if (tokenMatch) {
            const token = tokenMatch[1];  // Extracted token
            console.log(`Bot created successfully: ${botName}, Token: ${token}`);

            // Save bot data to MongoDB
            const newBot = new Bot({
              botName: botName,
              username: botUsername,
              token: token,
            });

            await newBot.save();
            console.log(`Bot data saved successfully to MongoDB: ${botName}, ${botUsername}, ${token}`);
          } else {
            console.error('Token extraction failed. Skipping bot creation.');
          }
        } else {
          console.error('Bot creation failed or message format unexpected. Skipping bot creation.');
        }

      } catch (error) {
        console.error('Error creating bot or saving to MongoDB:', error);
      }
    }, 60000);  // Creates a bot every minute (60000 ms)

  } catch (error) {
    console.error('Error during client connection or BotFather interaction:', error);
  }
}

// Helper function to generate a random string of alphabetic characters
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';  // Only alphabetic characters
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

run();
