import type { FormConfig } from '../../lib/types.ts';

export default {
  id: "theology-night",
  eyebrow: "Theology Night",
  title: "Help pick our topics",
  description: "We'll discuss the three topics with the most votes. Choose up to three from either list.",
  submitLabel: "Cast my vote",
  closesAt: "2026-10-31T23:59:00-04:00",
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
              id: "covenant-dispensational",
              label: "Covenant vs. Dispensational Theology",
              description: "Who is the true Israel, who inherits the covenants, and how each view reads the story of the Bible."
            },
            {
              id: "sacraments",
              label: "Baptism & Communion: Signs or More?",
              description: "Are the sacraments symbols only, or does God actually do something through them?"
            },
            {
              id: "gender-roles",
              label: "Complementarianism vs. Egalitarianism",
              description: "What Scripture teaches about the roles of men and women in the church and the home."
            },
            {
              id: "end-times",
              label: "The End Times",
              description: "Premillennial, postmillennial, and amillennial views, and how to read Revelation."
            },
            {
              id: "atonement",
              label: "What Happened on the Cross?",
              description: "Penal substitution, Christus Victor, and whether we have to choose between them."
            },
            {
              id: "genesis",
              label: "Reading Genesis 1–11",
              description: "Creation, Adam and Eve, and the Flood: literal history, literary framework, or something in between?"
            },
            {
              id: "lesser-evil",
              label: "Is It Ever Right to Sin?",
              description: "Lying to save a life or stealing to feed a starving family: what to do when commands seem to collide."
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
              id: "resurrection",
              label: "The Resurrection",
              description: "The historical evidence for the empty tomb, and why everything hinges on it."
            },
            {
              id: "scripture",
              label: "Can We Trust the Bible?",
              description: "Is the Bible reliable, and how do we know the 66 books of the Protestant canon are God's inspired Word?"
            },
            {
              id: "free-will-evil",
              label: "Free Will & Evil",
              description: "Does real freedom require the possibility of evil, and why would a good God allow it?"
            },
            {
              id: "never-heard",
              label: "Those Who Have Never Heard",
              description: "What happens to people who die without ever hearing the gospel?"
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
