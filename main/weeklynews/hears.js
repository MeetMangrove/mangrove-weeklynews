/**
 * Created by thomasjeanneau on 09/04/2017.
 */

import Promise from 'bluebird'

import { getSlackUser, checkIfBuilder } from '../methods'
import { controller } from './config'
import sendMessage from './sendMessage'
import getNews from './getNews'

require('dotenv').config()

const {NODE_ENV, PORT} = process.env

if (!NODE_ENV && !PORT) {
  console.log('Error: Specify NODE_ENV and PORT in a .env file')
  process.exit(1)
}

// Builder Commands

controller.hears(['^send message$'], ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    const isBuilder = await checkIfBuilder(bot, message)
    if (isBuilder) {
      const {name} = await getSlackUser(bot, message.user)
      await sendMessage(bot, message, name)
    } else {
      bot.reply(message, `You need to be a builder if you want to use this command :ghost:`)
    }
  } catch (e) {
    console.log(e)
    bot.reply(message, `Oops..! :sweat_smile: A little error occur: \`${e.message || e.error || e}\``)
  }
})

controller.hears(['^get news$'], ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    const isBuilder = await checkIfBuilder(bot, message)
    if (isBuilder) {
      await getNews(bot, message)
    } else {
      bot.reply(message, `You need to be a builder if you want to use this command :ghost:`)
    }
  } catch (e) {
    console.log(e)
    bot.reply(message, `Oops..! :sweat_smile: A little error occur: \`${e.message || e.error || e}\``)
  }
})

controller.hears(['^template$'], ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    const isBuilder = await checkIfBuilder(bot, message)
    if (isBuilder) {
      bot.reply(message, `This is the template to create a weekly news: <https://docs.google.com/document/d/1mbDYUZYr434mUtzkn0I86oss9hrKphQb0Qwy02zXGWM/edit?usp=sharing|Template Weekly News>`)
    } else {
      bot.reply(message, `You need to be a builder if you want to use this command :ghost:`)
    }
  } catch (e) {
    console.log(e)
    bot.reply(message, `Oops..! :sweat_smile: A little error occur: \`${e.message || e.error || e}\``)
  }
})

// User Commands

controller.hears(['^Hello$', '^Yo$', '^Hey$', '^Hi$', '^Ouch$'], ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    const {name} = await getSlackUser(bot, message.user)
    const botReply = Promise.promisify(bot.reply)
    await botReply(message, `Hi ${name}! I'm the Weekly News bot of Mangrove :tada:`)
    const isBuilder = await checkIfBuilder(bot, message)
    if (isBuilder) {
      await botReply(message, `Say \`send message\` if you want me to send a personal message to everybody and get some news :rocket:`)
    } else {
      await botReply(message, `You need to be a builder if you want to use me :ghost:`)
    }
  } catch (e) {
    console.log(e)
    bot.reply(message, `Oops..! :sweat_smile: A little error occur: \`${e.message || e.error || e}\``)
  }
})

controller.hears(['^help$', '^options$'], ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    const {name} = await getSlackUser(bot, message.user)
    const isBuilder = await checkIfBuilder(bot, message)
    if (isBuilder) {
      const botReply = Promise.promisify(bot.reply)
      await botReply(message, `Hi ${name}! What can I do for you ? :slightly_smiling_face:`)
      await botReply(message, {
        attachments: [{
          pretext: 'This is what you can ask me:',
          text: `\`send message\` - Send a custom message to everyone and display answers. You can use the variable _{firstName}_ to personalize the message\n\`get news\` - Get all last messages that people have sent to you since your message\n\`template\` - Display the template of a weekly news`,
          mrkdwn_in: ['text', 'pretext']
        }]
      })
    } else {
      bot.reply(message, `Hi ${name}! You need to be a builder if you want to use me :ghost:`)
    }
  } catch (e) {
    console.log(e)
    bot.reply(message, `Oops..! :sweat_smile: A little error occur: \`${e.message || e.error || e}\``)
  }
})

controller.hears('[^\n]+', ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    const {name} = await getSlackUser(bot, message.user)
    bot.startConversation(message, function (err, convo) {
      if (err) return console.log(err)
      convo.say(`Sorry ${name}, but I'm too young to understand what you mean :flushed:`)
      convo.say(`If you need help, just tell me \`help\` :wink:`)
    })
  } catch (e) {
    console.log(e)
    bot.reply(message, `Oops..! :sweat_smile: A little error occur: \`${e.message || e.error || e}\``)
  }
})
