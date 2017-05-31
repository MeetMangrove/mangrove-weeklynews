/**
 * Created by thomasjeanneau on 31/05/2017.
 */

import _ from 'lodash'
import Promise from 'bluebird'
import asyncForEach from 'async-foreach'

import { controller } from './config'

const {forEach} = asyncForEach

export default async (bot, message) => {
  const botReply = Promise.promisify(bot.reply)
  const getUser = Promise.promisify(controller.storage.users.find)
  await botReply(message, `Looking for all responses...`)
  const apiIm = Promise.promisifyAll(bot.api.im)
  const {ims} = await apiIm.listAsync({
    token: bot.config.bot.app_token
  })
  forEach(ims, async function ({id, user}) {
    const done = this.async()
    const slackUser = await getUser({slack_id: user})
    const { last_ts: lastTs } = slackUser[0] || {last_ts: null}
    if (lastTs && user !== message.user && user !== bot.identifyBot().id) {
      const {messages} = await apiIm.historyAsync({
        token: bot.config.bot.app_token,
        channel: id,
        oldest: 1496191501.720946, // TODO: replace by lastTs
        count: 3
      })
      if (messages.length > 0) {
        await botReply(message, {
          text: `:scroll: *News from <@${user}>* :scroll:`,
          attachments: _.map(messages, ({text}) => ({text, mrkdwn_in: ['text']}))
        })
      }
    }
    done()
  }, async () => {
    await botReply(message, `Done! :clap:`)
  })
}
