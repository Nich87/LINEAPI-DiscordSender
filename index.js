'use strict';

const line = require('@line/bot-sdk');
const FormData = require('form-data');
const express = require('express');
const axios = require('axios');
const WebhookUrl = process.env.DISCORD_WEBHOOK_URL;
const PORT = process.env.PORT;

//各種Configの宣言
const Configs = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};
//Content-Typeはここで指定しない(画像データを含むため)
const WebhookConfig = {
    headers: {
        'Accept': 'application/json',
    },
};
/* --------------- */

const client = new line.Client(Configs); //Clientの作成

/* LINEAPIから受け取ったデータをDiscordへ送るデータへ整形する関数 */
const MakePostData = async (event, profile, form) => {
    const type = event.message.type; //Message-Typeの取得
    form.append('username', profile.displayName); //LINEの名前を取得・追加
    form.append('avatar_url', `${profile.pictureUrl}.png`) //LINEのプロフィール画像を取得・追加
    if (type !== 'text') { //テキストトーク以外(写真・ビデオ・音声) | 条件絞らないとエラー吐きそうなので変更したほうが良い
        const imageStream = await client.getMessageContent(event.message.id); //ここで画像データを取得(streamから受け取ったchunkをappendすると破損する)
        form.append('image', imageStream, 'file.jpg'); //メッセージ画像を追加・命名
        return { form: form }
    }
    form.append('content', event.message.text);
    return { form: form }
};

const lineBot = async (req, res) => {
    res.status(200).end(); // 'status 200'をLINEAPIに返す(必須)
    const events = req.body.events;
    events.forEach(async (event) => {
        try {
            const form = new FormData();
            const profile = await client.getProfile(event.source.userId); //プロフィール情報の取得
            await MakePostData(event, profile, form); //POSTデータの作成
            //AxiosでWebhookへPOST(URL,form)
            await axios.post(WebhookUrl, form, {
                headers: form.getHeaders(WebhookConfig)
            });
        } catch (err) console.error(err);
    });
};

//サーバーの作成
const app = express();
app.post('/', line.middleware(Configs), (req, res) => {
    lineBot(req, res);
});
app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`)
});

/*
Copyright (c) 2021 Nich87(とうちん#3037) & Reika87(@holo_kiri)
This software is released under the MIT License.
http://opensource.org/licenses/mit-license.php
*/
