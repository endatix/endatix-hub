export const defaultSurveyJson = {
  title: "KANTAR POC",
  completedHtmlOnCondition: [
    {
      expression: "{Q0.value} <> 1",
      html: "<img src='/assets/images/kantar/scan.gif' style='width: 200px;'><p>Thanks for letting us know, but on this occasion, we are interested in talking to people who can tell us about this specific purchase.</p><p>Don't worry though - please just click continue to get your tokens!</p>"
    },
    {
      expression: "{Q0b.value} <> 1",
      html: "<img src='/assets/images/kantar/scan.gif' style='width: 200px;'><p>Thanks for letting us know, but we are now interested in asking some questions about the experience consuming {u_req_product}.</p><p>We will send you another questionnaire in a couple days once you’ve had a chance to consume {u_req_product}.</p><p>Please click continue to get your tokens!</p>"
    }
  ],
  triggers: [
    {
      type: "complete",
      expression: "{Q0.value} <> 1"
    },
    {
      type: "complete",
      expression: "{Q0b.value} <> 1"
    }
  ],
  pages: [
    {
      name: "page_intro",
      elements: [
        {
          type: "html",
          name: "welcome_message",
          html: "<img src='/assets/images/kantar/clipboard.gif' style='width: 120px;'><p>We'd like to ask you some questions about your recent trip to {u_req_store} on {u_req_date}, where you bought {u_req_product}.</p><p>Please take a moment to answer the following questions.</p>"
        }
      ]
    },
    {
      name: "page_Q0",
      elements: [
        {
          type: "kantar_radiogroup",
          name: "Q0",
          isRequired: true,
          title: "Q0: First, can we just confirm - did you visit {u_req_store} on {u_req_date} yourself and buy {u_req_product}?",
          random: false,
          enableVerbatimOther: false,
          choices: [
            {
              value: "1",
              text: "Yes, I visited this shop myself and bought {u_req_product}"
            },
            {
              value: "2",
              text: "I visited this shop but bought a different product"
            },
            {
              value: "3",
              text: "I didn't make this shopping trip or buy this product"
            },
            {
              value: "98",
              text: "Don't know/Can't recall"
            }
          ]
        }
      ]
    },
    {
      name: "page_Q1",
      elements: [
        {
          type: "kantar_radiogroup",
          name: "Q1",
          isRequired: true,
          title: "Q1: Did you plan to buy {u_req_product} on this visit, or did you decide to buy it once you were in the store?",
          enableVerbatimOther: false,
          choices: [
            {
              value: "1",
              text: "I planned to buy {u_req_product} before I visited the store"
            },
            {
              value: "2",
              text: "I planned to buy sweet snacks, but not this specific product"
            },
            {
              value: "3",
              text: "I hadn't planned to buy sweet snacks at all"
            },
            {
              value: "98",
              text: "Don't know/Can't recall"
            }
          ]
        }]
    },
    {
      name: "page_Q2",
      elements: [
        {
          type: "kantar_checkbox",
          name: "Q2",
          isRequired: true,
          title: "Q2: Did you purchase {u_req_product} for any of the following reasons?",
          enableVerbatimOther: false,
          random: true,
          choices: [
            {
              value: "1",
              text: "It was on promotion"
            },
            {
              value: "2",
              text: "It was a good price"
            },
            {
              value: "3",
              text: "It looked like good value for money"
            },
            {
              value: "4",
              text: "It’s made with quality ingredients"
            },
            {
              value: "5",
              text: "It looked tasty"
            },
            {
              value: "6",
              text: "The size of the pack"
            },
            {
              value: "7",
              text: "The packaging caught my attention"
            },
            {
              value: "8",
              text: "I wanted to try something different [Plausibility check vs code 15&16]"
            },
            {
              value: "9",
              text: "I’d seen / heard an advertisement for it"
            },
            {
              value: "10",
              text: "I’d received a free sample"
            },
            {
              value: "11",
              text: "I saw it at the end of an aisle/on a display"
            },
            {
              value: "12",
              text: "Someone else asked me to buy it"
            },
            {
              value: "13",
              text: "It was recommended to me"
            },
            {
              value: "14",
              text: "I like the {u_req_brand} brand"
            },
            {
              value: "15",
              text: "I’ve tried it before [Plausibility check vs code 8]"
            },
            {
              value: "16",
              text: "I always buy it [Plausibility check vs code 8]"
            },
            {
              value: "96",
              text: "Other – please specify"
            },
            {
              value: "98",
              text: "Not sure/Can’t recall"
            }
          ]
        }]
    },
    {
      name: "page_Q2b",
      elements: [
        {
          type: "kantar_ranking",
          name: "Q2b",
          isRequired: true,
          visibleIf: "MultipleAnswers({Q2.value})",
          title: "Q2b: Please rank the top {Q2TopCount}, where 1 = most important",
          sourceQuestion: "Q2"
        }]
    },
    {
      name: "page_Q3",
      elements: [
        {
          type: "kantar_checkbox",
          name: "Q3",
          isRequired: true,
          title: "Q3: Thinking back to the moment you’d chosen to purchase {u_req_product}, what made you choose the product?",
          enableVerbatimOther: false,
          random: true,
          choices: [
            {
              value: "1",
              text: "I really like {u_req_brand}"
            },
            {
              value: "2",
              text: "It suited the occasion I was buying sweet snacks for"
            },
            {
              value: "3",
              text: "It looked tasty"
            },
            {
              value: "4",
              text: "The size of the pack"
            },
            {
              value: "5",
              text: "High quality ingredients"
            },
            {
              value: "6",
              text: "It looked indulgent/ like a treat"
            },
            {
              value: "7",
              text: "It’s something new and exciting"
            },
            {
              value: "8",
              text: "Just to try it"
            },
            {
              value: "9",
              text: "It looked filling"
            },
            {
              value: "10",
              text: "I could share it easily"
            },
            {
              value: "11",
              text: "I enjoy chocolate orange flavour [only show to jaffa cakes buyers]",
              visibleIf: "{u_req_product} = 'Jaffa Cakes'"
            },
            {
              value: "12",
              text: "It reminded me of my childhood/the past"
            },
            {
              value: "13",
              text: "It’s not too filling/it’s a lighter option"
            },
            {
              value: "96",
              text: "Other – please specify"
            },
            {
              value: "98",
              text: "Not sure/Can’t recall"
            }
          ]
        }]
    },
    {
      name: "page_Q4",
      elements: [
        {
          type: "kantar_checkbox",
          name: "Q4",
          title: "Q4: Thinking back to when you were in {u_req_store} - did you notice any of these other sweet snack brands?",
          enableVerbatimOther: false,
          isRequired: true,
          random: true,
          choices: [
            {
              value: "1",
              text: "McVitie’s Jaffa Cakes"
            },
            {
              value: "2",
              text: "Oreo"
            },
            {
              value: "3",
              text: "Cadbury Fingers"
            },
            {
              value: "4",
              text: "McVitie’s Chocolate Digestives"
            },
            {
              value: "5",
              text: "Jammy Dodgers"
            },
            {
              value: "6",
              text: "Kit Kat"
            },
            {
              value: "7",
              text: "Maryland Cookies"
            },
            {
              value: "8",
              text: "Fox’s Crunch Creams"
            },
            {
              value: "9",
              text: "Wagon Wheels"
            },
            {
              value: "10",
              text: "Party Rings"
            },
            {
              value: "11",
              text: "{u_req_store} own label sweet snacks"
            },
            {
              value: "96",
              text: "Other – please specify"
            },
            {
              value: "97",
              text: "I didn’t notice any of these other brands"
            },
            {
              value: "98",
              text: "Not sure/Can’t recall"
            }
          ]
        }]
    },
    {
      name: "page_Q5",
      visibleIf: "{Q4.value} notcontains '1'",
      isRequired: true,
      elements: [
        {
          "type": "image",
          "name": "question3",
          "imageLink": "/assets/images/kantar/cookies.jpg",
          "imageFit": "cover",
          "imageHeight": "auto",
          "imageWidth": "400"
        },
        {
          type: "kantar_radiogroup",
          name: "Q5",
          isRequired: true,
          title: "Q5: And do you remember seeing the McVitie’s Jaffa Cakes brand specifically? ",
          choices: [
            {
              value: "1",
              text: "Yes, I remember seeing McVitie’s Jaffa Cakes"
            },
            {
              value: "2",
              text: "No, I don’t remember seeing McVitie’s Jaffa Cakes"
            },
            {
              value: "98",
              text: "Not sure/Can’t recall"
            }
          ]
        }
      ]
    },
    {
      name: "page_Q6",
      visibleIf: "{Q4.value} <> [1]",
      isRequired: true,
      elements: [
        {
          type: "kantar_checkbox",
          name: "Q6",
          isRequired: true,
          title: "Q6: Did you consider buying any of the other brands you noticed in {u_req_store} on this occasion?",
          choices: [
            {
              value: "1",
              text: "McVitie’s Jaffa Cakes",
              visibleIf: "{Q5.value} equals '1'"
            },
            {
              value: "97",
              text: "I didn’t notice any of these other brands"
            },
            {
              value: "98",
              text: "Not sure/Can’t recall"
            }
          ]
        }
      ]
    },
    {
      name: "page_Q0b",
      isRequired: true,
      elements: [
        {
          type: "kantar_radiogroup",
          name: "Q0b",
          isRequired: true,
          title: "Q0b: Has {u_req_product} been consumed yet since you purchased them on {u_req_date}?",
          choices: [
            {
              value: "1",
              text: "Yes, {u_req_product} has been consumed",
            },
            {
              value: "2",
              text: "{u_req_product} hasn’t been consumed yet"
            },
            {
              value: "98",
              text: "Not sure/Can’t recall"
            }
          ]
        }
      ]
    },
    {
      name: "page_Q8",
      isRequired: true,
      elements: [
        {
          type: "kantar_radiogroup",
          name: "Q8",
          isRequired: true,
          title: "Q8: You told us {u_req_product} has been consumed, could you tell us who consumed it?",
          enableVerbatimOther: false,
          choices: [
            {
              value: "1",
              text: "Myself",
            },
            {
              value: "2",
              text: "Spouse / partner",
            },
            {
              value: "3",
              text: "Another adult in my household",
            },
            {
              value: "4",
              text: "A child / children",
            },
            {
              value: "96",
              text: "Other - please specify"
            },
            {
              value: "98",
              text: "Don't know/Can’t recall"
            }
          ]
        }
      ]
    },
    {
      name: "page_Q9",
      isRequired: true,
      elements: [
        {
          type: "kantar_checkbox",
          name: "Q9",
          isRequired: true,
          title: "Q9: Which of the below best describes why {consumer} ate {u_req_product}? ",
          enableVerbatimOther: false,
          choices: [
            {
              value: "1",
              text: "As a treat/ reward"
            },
            {
              value: "2",
              text: "Something to keep me [them] going"
            },
            {
              value: "3",
              text: "{consumer_i_they} fancied something sweet"
            },
            {
              value: "4",
              text: "Something convenient"
            },
            {
              value: "5",
              text: "Something quick"
            },
            {
              value: "6",
              text: "To fill {consumer_me_them} up"
            },
            {
              value: "7",
              text: "Something that everyone will enjoy"
            },
            {
              value: "8",
              text: "For a relaxing moment"
            },
            {
              value: "9",
              text: "For an indulgent moment"
            },
            {
              value: "10",
              text: "To share with others"
            },
            {
              value: "11",
              text: "To give {consumer_me_them} a boost of energy"
            },
            {
              value: "12",
              text: "To have something new and different"
            },
            {
              value: "13",
              text: "For dessert"
            },
            {
              value: "14",
              text: "{consumer_i_they} enjoy chocolate orange flavour",
              visibleIf: "{u_req_product} = 'Jaffa Cakes'"
            },
            {
              value: "15",
              text: "It’s fun to eat"
            },
            {
              value: "16",
              text: "It’s good to have on the go"
            },
            {
              value: "96",
              text: "Other – please specify [verbatim]"
            },
            {
              value: "98",
              text: "Don’t know/can’t recall"
            }
          ]
        }
      ]
    },
    {
      name: "page_Q10",
      isRequired: true,
      elements: [
        {
          type: "rating",
          name: "Q10",
          title: "Q10: How would {consumer} rate your overall experience consuming {u_req_product}?",
          isRequired: true,
          rateCount: 10,
          rateMax: 10,
          minRateDescription: "{consumer_i_was_they_were} completely satisfied with product",
          maxRateDescription: "{consumer_i_was_they_were} completely unsatisfied with product",
          displayMode: "buttons"
        }
      ]
    },
    {
      name: "page_Q11",
      elements: [
        {
          type: "comment",
          name: "Q11",
          title: "Q11: Could you tell us a little more about {consumer_your} experience consuming {u_req_product} vs your expectations?  What did you like or dislike?"
        }
      ]
    },
    {
      name: "page_screener",
      elements: [
        {
          type: "html",
          name: "Q_screener",
          html: "<p>We will now ask you some questions about McVitie’s Jaffa Cakes specifically.</p><p>Here is a picture of some McVitie’s Jaffa Cakes products. McVitie’s Jaffa Cakes are light sponge cakes with dark crackly chocolate and a tangy orangey centre.</p><img src='/assets/images/kantar/xmas.jpg' style='width: 400px;'><p>Please take your time to zoom in to the images and look in more detail at the different features of the product before sharing your thoughts with us.</p>"
        }
      ]
    },
    {
      name: "page_Q12",
      elements: [
        {
          type: "panel",
          name: "Q12x",
          title: "Q12: Thinking about the meals you ate in the past 7 days, how many meals were: ",
          description: "For any of these that apply, enter a number between 0 and 50.",
          elements: [
            {
              type: "text",
              name: "Q12_1",
              visibleIf: "{Q12.value} notcontains 98 and {Q12.value} notcontains 97",
              title: "Prepared at home from scratch ingredients (including meals prepared from scratch by others e.g. family, friends, colleagues)  ",
              inputType: "number",
              min: 0,
              max: 50
            },
            {
              type: "text",
              name: "Q12_2",
              visibleIf: "{Q12.value} notcontains 98 and {Q12.value} notcontains 97",
              title: "Ready meal prepared at home (e.g. supermarket ready meals, fish fingers, pizzas, etc ) ",
              inputType: "number",
              min: 0,
              max: 50
            },
            {
              type: "text",
              name: "Q12_3",
              visibleIf: "{Q12.value} notcontains 98 and {Q12.value} notcontains 97",
              title: "Pre-prepared food from a restaurant, fast food or takeaway place, or vending machine ",
              inputType: "number",
              min: 0,
              max: 50
            },
            {
              type: "kantar_checkbox",
              name: "Q12_radio",
              titleLocation: "hidden",
              choices: [
                {
                  value: "96",
                  text: "Other - please specify"
                },
                {
                  value: "97",
                  text: "Don't know/Can’t recall"
                },
                {
                  value: "98",
                  text: "Prefer not to say "
                }
              ]
            }
          ]
        }
      ]
    },
    {
      name: "page_Q13",
      visibleIf: "{Q12_3} > 0",
      elements: [
        {
          type: "matrixdropdown",
          name: "Q13",
          validators: [
            {
              type: "expression"
            }
          ],
          columns: [
            {
              name: "Q13_values",
              cellType: "text",
              inputType: "number",
              min: 0,
              max: 50
            }
          ],
          choices: [
            1,
            2,
            3,
            4,
            5
          ],
          cellType: "text",
          rows: [
            {
              value: "1",
              text: "Fast food / take-away  "
            },
            {
              value: "2",
              text: "Café /coffee shop  "
            },
            {
              value: "3",
              text: "Sit-down restaurant or pub  "
            },
            {
              value: "4",
              text: "Work or school / university / college canteen (NOT including fast food chains) "
            },
            {
              value: "5",
              text: "Sandwich / ready-meal from a supermarket "
            },
            {
              value: "6",
              text: "Burger, chip or kebab van / ‘street food’ "
            },
            {
              value: "7",
              text: "Convenience shop / corner shop / petrol station "
            },
            {
              value: "8",
              text: "Leisure centre, recreation, or entertainment venue "
            },
            {
              value: "9",
              text: "Vending machine "
            }
          ]
        }
      ]
    },
    {
      name: "page_Q14",
      elements: [
        {
          type: "kantar_checkbox",
          name: "Q14",
          title: "Q14: Thinking back to when you were in {u_req_store} - did you notice any of these other sweet snack brands?",
          choices: [
            {
              value: "1",
              text: "McVitie’s Jaffa Cakes"
            },
            {
              value: "2",
              text: "Oreo"
            },
            {
              value: "3",
              text: "Cadbury Fingers"
            },
            {
              value: "4",
              text: "McVitie’s Chocolate Digestives"
            },
            {
              value: "5",
              text: "Jammy Dodgers"
            },
            {
              value: "6",
              text: "Kit Kat"
            },
            {
              value: "7",
              text: "Maryland Cookies"
            },
            {
              value: "8",
              text: "Fox’s Crunch Creams"
            },
            {
              value: "9",
              text: "Wagon Wheels"
            },
            {
              value: "10",
              text: "Party Rings"
            },
            {
              value: "11",
              text: "{u_req_store} own label sweet snacks"
            },
            {
              value: "96",
              text: "Other – please specify [verbatim]"
            },
            {
              value: "97",
              text: "I didn’t notice any of these other brands"
            },
            {
              value: "98",
              text: "Not sure/Can’t recall"
            }
          ]
        }
      ]
    },
    {
      name: "page_Q15",
      visibleIf: "{Q14.value} notempty and {Q14.value} notcontains 97 and {Q14.value} notcontains 98",
      elements: [
        {
          type: "paneldynamic",
          name: "Q15",
          templateElements: [
            {
              type: "matrix",
              name: "q15_matrix",
              title: "How would you describe {panel.title}",
              columns: [
                "Strongly agree",
                "Agree",
                "Neither agree nor disagree",
                "Disagree",
                "Strong disagree"
              ],
              rows: [
                {
                  value: "1",
                  text: "It’s something new and different"
                },
                {
                  value: "2",
                  text: "It looks indulgent/a treat"
                },
                {
                  value: "3",
                  text: "It would be suitable for sweet snacks occasions I have"
                },
                {
                  value: "4",
                  text: "The flavour seems appealing"
                },
                {
                  value: "5",
                  text: "It looks like good value for money"
                },
                {
                  value: "6",
                  text: "It would be fun and exciting to eat"
                },
                {
                  value: "7",
                  text: "It looks premium"
                },
                {
                  value: "8",
                  text: "It’s worth paying more for"
                },
                {
                  value: "9",
                  text: "Has good quality ingredients"
                },
                {
                  value: "10",
                  text: "Is suitable for someone like me"
                },
                {
                  value: "11",
                  text: "Is easy to share"
                },
                {
                  value: "12",
                  text: "It’s nostalgic"
                },
                {
                  value: "13",
                  text: "It’s a family favourite"
                },
                {
                  value: "14",
                  text: "It’s a brand I’m happy to be seen with"
                },
                {
                  value: "16",
                  text: "It’s better than other Jaffa Cakes"
                },
                {
                  value: "17",
                  text: "It’s for children"
                }
              ],
              rowsOrder: "random"
            }
          ],
          allowAddPanel: false,
          allowRemovePanel: false,
          renderMode: "progressTopBottom",
          progressBarLocation: "topBottom",
          displayMode: "carousel"
        }
      ]
    },
    {
      name: "page_Q17",
      elements: [
        {
          type: "file",
          name: "Q17",
          title: "Q17: What might make you buy biscuits more in the future?",
          description: "Please make sure to record for at least 20 seconds, otherwise your response won't be submitted, and you won't receive your tokens!",
          acceptedTypes: "video/*",
          storeDataAsText: false,
          sourceType: "file-camera"
        }
      ]
    }
  ],
  calculatedValues: [
    {
      name: "Q2TopCount",
      expression: "TopCount({Q2.value})"
    },
    {
      name: "consumer",
      expression: "iif({Q8.value} equal '1', 'you', 'the consumer')"
    },
    {
      name: "consumer_i_they",
      expression: "iif({Q8.value} equal '1', 'I', 'they')"
    },
    {
      name: "consumer_me_them",
      expression: "iif({Q8.value} equal '1', 'me', 'them')"
    },
    {
      name: "consumer_i_was_they_were",
      expression: "iif({Q8.value} equal '1', 'I was', 'They were')"
    },
    {
      name: "consumer_your",
      expression: "iif({Q8.value} equal '1', 'I', 'the consumer')"
    }
  ],
  showPreviewBeforeComplete: "showAllQuestions"
};
