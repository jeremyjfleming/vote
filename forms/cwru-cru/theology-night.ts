import type { FormConfig } from '../../lib/types.ts';

export default {
  id: "theology-night",
  eyebrow: "Theology Night",
  title: "Help pick our topics",
  description: "We'll discuss the three topics with the most votes. Choose up to three from either list.",
  submitLabel: "Cast my vote",
  thankYou: {
    title: "Your vote is in",
    message: "Thanks for weighing in. We'll announce the three topics soon. See you at Theology Night!"
  },
  questions: [
    {
      id: "name",
      type: "text",
      label: "Your name",
      placeholder: "First name is fine",
      autocomplete: "given-name",
      summary: false
    },
    {
      id: "topics",
      type: "choice",
      multiple: true,
      required: true,
      max: 3,
      label: "Which topics do you want to discuss?",
      help: "Pick up to 3. The final three will include at least one topic from each list.",
      resultsTitle: "Topic votes",
      winners: 3,
      winnerRule: "one-per-group",
      groups: [
        {
          id: "second-tier",
          label: "Second-tier issues",
          description: "Important doctrines where faithful, Bible-believing Christians land in different places.",
          options: [
            {
              id: "baptism",
              label: "Baptism",
              description: "Infants or believers only? Sprinkling or immersion? What baptism does and what it means."
            },
            {
              id: "lords-supper",
              label: "The Lord's Supper",
              description: "Memorial, spiritual presence, or real presence? Who should take it, and how often?"
            },
            {
              id: "spiritual-gifts",
              label: "Spiritual Gifts",
              description: "Cessationism vs. continuationism: are tongues, prophecy, and healing for today?"
            },
            {
              id: "end-times",
              label: "The End Times",
              description: "Pre-, post-, and amillennialism, the rapture, and how to read Revelation."
            },
            {
              id: "predestination",
              label: "Predestination & Free Will",
              description: "Calvinism, Arminianism, and how God's sovereignty relates to human choice."
            },
            {
              id: "women-in-ministry",
              label: "Women in Ministry",
              description: "Complementarian and egalitarian readings of the key passages."
            },
            {
              id: "church-government",
              label: "Church Government",
              description: "Elders, bishops, or congregations: how should a church be led?"
            },
            {
              id: "creation",
              label: "Creation & the Age of the Earth",
              description: "Young-earth, old-earth, and other readings of Genesis 1–2."
            }
          ]
        },
        {
          id: "first-tier",
          label: "First-tier & apologetics",
          description: "Core convictions of the Christian faith, and how we give a reason for the hope we have.",
          options: [
            {
              id: "trinity",
              label: "The Trinity",
              description: "One God in three persons: what it means, why it matters, and common misunderstandings."
            },
            {
              id: "deity-of-christ",
              label: "The Deity of Christ",
              description: "Fully God and fully man: the biblical case and the early church's answer."
            },
            {
              id: "resurrection",
              label: "The Resurrection",
              description: "The historical evidence for the empty tomb, and why everything hinges on it."
            },
            {
              id: "gospel",
              label: "Saved by Grace Through Faith",
              description: "Justification, works, and what the gospel actually is."
            },
            {
              id: "scripture",
              label: "Can We Trust the Bible?",
              description: "Manuscripts, the canon, and the inspiration and authority of Scripture."
            },
            {
              id: "god-exists",
              label: "Does God Exist?",
              description: "The cosmological, moral, and design arguments, and the strongest objections."
            },
            {
              id: "problem-of-evil",
              label: "The Problem of Evil",
              description: "If God is good and all-powerful, why is there suffering?"
            },
            {
              id: "exclusivity",
              label: "Is Jesus the Only Way?",
              description: "The exclusivity of Christ in a pluralistic world."
            }
          ]
        }
      ]
    },
    {
      id: "suggestion",
      type: "textarea",
      label: "Anything else you'd like us to cover?",
      placeholder: "Suggest a topic for a future night",
      rows: 3
    }
  ]
} satisfies FormConfig;
