const express = require('express');
const axios = require('axios');
const line = require('@line/bot-sdk');
const PORT = process.env.PORT;
const FormData = require('form-data');


const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new line.Client(lineConfig);

const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
const discordWebhookConfig = {
  headers: {
    'Accept': 'application/json',
  },
};

const generatePostData = async (event, profile, form) => {
  const type = event.message.type;
  form.append('username', profile.displayName);
  form.append('avatar_url', `${profile.pictureUrl}.png`)
  if (type !== 'text') {
    const imageStream = await client.getMessageContent(event.message.id)
    form.append('image', imageStream, 'file.jpg');
    //console.log(form);
    return {
      form: form
    }
  }
  form.append('content', event.message.text);
  return {
    form: form
  }
};

const lineBot = async (req, res) => {
  res.status(200).end(); // 'status 200'をLINEのAPIに送信

  const events = req.body.events;
  events.forEach(async (event) => {
    try {
      const form = new FormData();
      const profile = await client.getProfile(event.source.userId);
      const postData = await generatePostData(event, profile, form);
      // DiscordのWebHookにPOST
      await axios.post(discordWebhookUrl, form, {
        headers: form.getHeaders(discordWebhookConfig)
      });
    } catch (error) {
      console.error(error);
    }
  });
};


const app = express();
app.post('/', line.middleware(lineConfig), (req, res) => {
  lineBot(req, res);
});
app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`)
});

