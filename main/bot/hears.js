/**
 * Created by thomasjeanneau on 09/04/2017.
 */

import Promise from 'bluebird'

import { getSlackUser, checkIfBuilder } from '../methods'
import { controller } from './config'
import getNews from './getNews'

require('dotenv').config()

const {NODE_ENV} = process.env

if (!NODE_ENV) {
  console.log('Error: Specify NODE_ENV in a .env file')
  process.exit(1)
}

// Builder Commands

controller.hears(['^get news$'], ['direct_message', 'direct_mention'], async (bot, message) => {
  try {
    const {name} = await getSlackUser(bot, message.user)
    const botReply = Promise.promisify(bot.reply)
    const isBuilder = await checkIfBuilder(bot, message)
    if (isBuilder) {
      await getNews(bot, message, name)
    } else {
      await botReply(message, `You need to be a builder if you want to use this command :ghost:`)
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
      await botReply(message, `Say \`get news\` if you want me to send a personal message to everybody and get some news :rocket:`)
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
    const botReply = Promise.promisify(bot.reply)
    const isBuilder = await checkIfBuilder(bot, message)
    if (isBuilder) {
      await botReply(message, `Hi ${name}! What can I do for you ? :slightly_smiling_face:`)
      await botReply(message, {
        attachments: [{
          pretext: 'This is what you can ask me:',
          text: `\`get news\` - Send a custom message to everyone and display answers. You can use the variable _{firstName}_ to personalize the message.`,
          mrkdwn_in: ['text', 'pretext']
        }]
      })
    } else {
      await botReply(message, `Hi ${name}! You need to be a builder if you want to use me :ghost:`)
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
