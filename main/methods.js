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

// get all slack members
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
export const getRandomMembers = (bot, message) => new Promise(async (resolve, reject) => {
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
          'Asked for news this month [weeklynews]': false,
          'Message Timestamp [weeklynews]': null,
          'Asked by [weeklynews]': null
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

// reads all members from Airtable, and returns
// a boolean checking if the current user is responsible of the Weekly News.
export const checkIfResponsible = async (bot, message) => {
  const slackUser = await getSlackUser(bot, message.user)
  const records = await _getAllRecords(base(AIRTABLE_MEMBERS).select({
    view: 'Main View',
    fields: ['Slack Handle'],
    filterByFormula: `AND(
      FIND('Cofounder', {Status}),
      {Is responsible ? [weeklynews]} = 1
    )`
  }))
  const responsible = records[0].get('Slack Handle').replace(/^@/, '')
  return {
    isResponsible: responsible === slackUser.name,
    responsible
  }
}

export const checkIfBot = async (bot, id) => {
  if (id === 'USLACKBOT') return true
  const apiUsers = Promise.promisifyAll(bot.api.users)
  const {user: {is_bot: isBot}} = await apiUsers.infoAsync({token: bot.config.bot.app_token, user: id})
  return isBot
}

export const getResponsibles = async (bot) => {
  const members = []
  const records = await _getAllRecords(base(AIRTABLE_MEMBERS).select({
    view: 'Main View',
    fields: ['Name', 'Slack Handle', 'Is responsible ? [weeklynews]'],
    filterByFormula: 'FIND(\'Cofounder\', {Status})'
  }))
  records.forEach((record) => {
    const name = record.get('Name')
    members.push({
      airtableId: record.id,
      slackName: record.get('Slack Handle').replace(/^@/, ''),
      lastName: name.substring(name.indexOf(' '), name.length),
      isResponsible: record.get('Is responsible ? [weeklynews]')
    })
  })
  members.sort(function (a, b) {
    if (a.lastName < b.lastName) return -1
    if (a.lastName > b.lastName) return 1
    return 0
  })
  const index = _.findIndex(members, {isResponsible: true})
  const {slackName: responsibleName, airtableId} = members[index]
  const nextIndex = index + 1 === members.length ? 0 : index + 1
  const {slackName: nextResponsibleName, airtableId: nextAirtableId} = members[nextIndex]
  const allMembers = await getAllMembers(bot)
  const {id: responsibleId} = _.find(allMembers, {name: responsibleName})
  const {id: nextResponsibleId} = _.find(allMembers, {name: nextResponsibleName})
  return {responsibleId, nextResponsibleId, airtableId, nextAirtableId}
}

export const getTimestamp = async (bot, userId, allMembers) => {
  const {name} = _.find(allMembers, {id: userId})
  const records = await _getAllRecords(base(AIRTABLE_MEMBERS).select({
    view: 'Main View',
    fields: ['Message Timestamp [weeklynews]'],
    filterByFormula: `{Slack Handle} = '@${name}')`
  }))
  return records[0].get('Message Timestamp [weeklynews]')
}

export const getUsersAskedByResponsible = async (bot, userId) => {
  const users = []
  const records = await _getAllRecords(base(AIRTABLE_MEMBERS).select({
    view: 'Main View',
    fields: ['Slack Handle'],
    filterByFormula: `AND(
      {Asked for news this month [weeklynews]} = 1,
      {Asked by [weeklynews]} = '${userId}'
    )`
  }))
  const allMembers = await getAllMembers(bot)
  records.forEach((record) => {
    const name = record.get('Slack Handle').replace(/^@/, '')
    const {id} = _.find(allMembers, {name})
    users.push(id)
  })
  return users
}
