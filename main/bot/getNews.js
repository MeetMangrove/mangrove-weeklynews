/**
 * Created by thomasjeanneau on 31/05/2017.
 */

import _ from 'lodash'
import Promise from 'bluebird'
import asyncForEach from 'async-foreach'

import { checkIfBot } from '../methods'
import { controller } from './config'

const {forEach} = asyncForEach

export default async (bot, message) => {
  const botReply = Promise.promisify(bot.reply)
  const getUser = Promise.promisify(controller.storage.users.find)
  await botReply(message, `Looking for all responses... :sleuth_or_spy:`)
  const apiIm = Promise.promisifyAll(bot.api.im)
  const {ims} = await apiIm.listAsync({
    token: bot.config.bot.app_token
  })
  let count = 0
  let replies = 0
  forEach(ims, async function ({id, user}) {
    const done = this.async()
    const slackUser = await getUser({id: user})
    const {last_ts: lastTs} = slackUser[0] || {last_ts: 1496191501.720946} // TODO: replace by null if saveUser is working in MongoDB
    if (await checkIfBot(bot, user) === false && lastTs && user !== message.user) {
      replies++
      const {messages} = await apiIm.historyAsync({
        token: bot.config.bot.app_token,
        channel: id,
        oldest: lastTs,
        count: 3
      })
      if (messages.length > 0) {
        count++
        await botReply(message, {
          text: `:scroll: *News from <@${user}>* :scroll:`,
          attachments: _.reverse(_.map(messages, ({text}) => ({text, mrkdwn_in: ['text']})))
        })
      }
    }
    done()
  }, async () => {
    await botReply(message, `Done! You have ${count} of ${replies} replies :clap:`)
  })
}
