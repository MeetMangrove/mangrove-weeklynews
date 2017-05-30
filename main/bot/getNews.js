/**
 * Created by thomasjeanneau on 30/05/2017.
 */

import Promise from 'bluebird'
import Handlebars from 'handlebars'

export default (bot, message, name) => new Promise((resolve, reject) => {
  try {
    bot.startPrivateConversation(message, (err, convo) => {
      if (err) return console.log(err)
      convo.addMessage({
        text: `Okay ${name}, let's build the weekly news!`
      }, 'default')

      convo.addQuestion('What\'s the message you want to send to everyone for asking some news ? You can use the variable _{firstName}_ if you want.', (response, convo) => {
        convo.gotoThread('completed')
      }, {key: 'response'}, 'default')

      convo.beforeThread('completed', (convo, next) => {
        const response = convo.extractResponse('response').replace(/{firstName}/, '{{firstName}}')
        const template = Handlebars.compile(response, {noEscape: true})
        console.log(template({firstName: 'Elon'}))
        convo.setVar('message', template({firstName: 'Elon'}))
        next()
      })

      convo.addMessage({
        text: 'Awesome, this is your message if he is sent to Elon Musk:',
        attachments: [{
          title: 'Message:',
          text: '{{{vars.message}}}',
          mrkdwn_in: ['text']
        }]
      }, 'completed')

      convo.addQuestion({
        text: 'I\'m gonna send this message to everyone for you.',
        attachments: [
          {
            title: 'Is it okay?',
            callback_id: '123',
            attachment_type: 'default',
            actions: [
              {
                'name': 'yes',
                'text': 'Yes',
                'value': 'yes',
                'type': 'button'
              },
              {
                'name': 'no',
                'text': 'No',
                'value': 'no',
                'type': 'button'
              },
              {
                'name': 'later',
                'text': 'Later',
                'value': 'later',
                'type': 'button'
              }
            ]
          }
        ]
      }, [
        {
          pattern: 'yes',
          callback: function (reply, convo) {
            convo.say(`All messages have been sent, you just have to wait for answers now :wink:`)
            convo.next()
          }
        },
        {
          pattern: 'no',
          callback: function (reply, convo) {
            convo.gotoThread('default')
          }
        },
        {
          pattern: 'later',
          callback: function (reply, convo) {
            convo.say('Okay, maybe later!')
            convo.next()
          }
        },
        {
          default: true,
          callback: function () {
            convo.repeat()
            convo.next()
          }
        }

      ], {}, 'completed')

      convo.on('end', () => {
        resolve()
      })
    })
  } catch (e) {
    reject(e)
  }
})
