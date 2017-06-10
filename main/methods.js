/**
 * Created by thomasjeanneau on 20/03/2017.
 */

import _ from 'lodash'
import Promise from 'bluebird'
import asyncForEach from 'async-foreach'

import { base } from './airtable/index'
const {forEach} = asyncForEach

const {
  AIRTABLE_MEMBERS
} = process.env

if (!AIRTABLE_MEMBERS) {
  console.log('Error: Specify AIRTABLE_MEMBERS in a .env file')
  process.exit(1)
}

// reads all records from a table
const _getAllRecords = (select) => {
  return new Promise((resolve, reject) => {
    let allRecords = []
    select.eachPage(function page (records, fetchNextPage) {
      allRecords = allRecords.concat(records)
      fetchNextPage()
    }, function done (err) {
      if (err) return reject(err)
      resolve(allRecords)
    })
  })
}

// get slack user info by id
export const getSlackUser = async (bot, id) => {
  const apiUser = Promise.promisifyAll(bot.api.users)
  const {user} = await apiUser.infoAsync({user: id})
  return user
}

// get member by id
export const getMember = async (id) => {
  const findMember = Promise.promisify(base(AIRTABLE_MEMBERS).find)
  const member = await findMember(id)
  return member
}

// get all members
export const getAllMembers = async (bot) => {
  const apiUser = Promise.promisifyAll(bot.api.users)
  const {members} = await apiUser.listAsync({token: bot.config.bot.app_token})
  return members
}

// update a airtable member
export const updateMember = async (id, object) => {
  const update = Promise.promisify(base(AIRTABLE_MEMBERS).update)
  const record = await update(id, object)
  return record
}

// get available members for weeklynews
export const getAvailableMembers = async () => {
  const records = await _getAllRecords(base(AIRTABLE_MEMBERS).select({
    view: 'Main View',
    fields: ['Slack Handle', 'Asked for news this month [weeklynews]']
  }))
  const members = _.map(records, (record) => ({
    airtableId: record.id,
    name: record.get('Slack Handle').replace(/^@/, ''),
    asked: record.get('Asked for news this month [weeklynews]')
  }))
  const numberMembers = Math.floor(members.length / 4)
  const membersAvailable = _.filter(members, {asked: undefined})
  return {members, numberMembers, membersAvailable}
}

// get 25% random available members
export const getRandomMembers = (bot, message) => {
  return new Promise(async (resolve, reject) => {
    try {
      const getResult = async (params) => {
        let {numberMembers, membersAvailable} = params
        const list = []
        for (let i = 0; i < numberMembers; i = i + 1) {
          const member = membersAvailable[Math.floor(Math.random() * membersAvailable.length)]
          _.remove(membersAvailable, ({name}) => { return name === member.name })
          if (member && member.name !== '') list.push(member)
        }
        const allSlackUser = await getAllMembers(bot)
        return _.map(list, ({name, airtableId}) => {
          const {id, profile: {first_name: firstName}} = _.find(allSlackUser, {name})
          return {airtableId, id, name, firstName}
        })
      }
      let res = await getAvailableMembers()
      if (res.membersAvailable.length < res.numberMembers) {
        bot.reply(message, `A lot of people has already been contacted, I'm cleaning the database...`)
        forEach(res.members, async function (member) {
          const done = this.async()
          await updateMember(member.airtableId, {
            'Asked for news this month [weeklynews]': false
          })
          done()
        }, async () => {
          res = await getAvailableMembers()
          resolve(await getResult(res))
        })
      } else {
        resolve(await getResult(res))
      }
    } catch (e) {
      reject(e)
    }
  })
}

// reads all members from Airtable, and returns
// a boolean checking if the current user is an builder or not.
export const checkIfBuilder = async (bot, message) => {
  const admins = []
  const apiUser = Promise.promisifyAll(bot.api.users)
  const records = await _getAllRecords(base(AIRTABLE_MEMBERS).select({
    view: 'Main View',
    filterByFormula: 'FIND(\'Cofounder\', {Status})'
  }))
  records.forEach((record) => {
    const name = record.get('Slack Handle')
    admins.push(name.replace(/^@/, ''))
  })
  const {user: {name}} = await apiUser.infoAsync({user: message.user})
  return admins.indexOf(name) >= 0
}

export const checkIfBot = async (bot, id) => {
  if (id === 'USLACKBOT') return true
  const apiUsers = Promise.promisifyAll(bot.api.users)
  const {user: {is_bot: isBot}} = await apiUsers.infoAsync({token: bot.config.bot.app_token, user: id})
  return isBot
}
