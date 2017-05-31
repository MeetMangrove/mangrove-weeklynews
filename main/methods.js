/**
 * Created by thomasjeanneau on 20/03/2017.
 */

import Promise from 'bluebird'

import { base } from './airtable/index'

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
