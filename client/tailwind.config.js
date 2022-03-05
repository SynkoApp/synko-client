module.exports = {
  content: ["./src/**/*.{js,jsx}",],
  theme: {
    extend: {
      colors: {
        'green-500': "#10b981"
      },
      fontSize : {
        "xxs" : "0.7rem"
      },

      width : {
        "input" : "98%",
        "avatar" : "44px"
      },
      
      height: {
        "avatar" : "44px"
      },

      backgroundColor : {
        "gray-750" : "#283141",
        "gray-650" : "#444D5D"
      },

      boxShadow : {
        "custom" : "0 0 750px 750px rgb(0 0 0 / 50%);",
        "input" : "0 -15px 25px -20px rgb(0 0 0 / 50%);"
      },

      minWidth: {
        "48": "12rem"
      },

      minHeight: {
        "12": "3rem",
        "16": "4rem",
        "20": "5rem",
        "24": "6rem",
      },

      maxHeight: {
        "64": "16rem"
      },

      maxWidth: {
        "96": "24rem"
      }
    },
  },
  variants: {
    extend: {
      borderRadius: ['hover'],
      filter: ['hover'],
      display: ['group-hover'],
      zIndex: ['hover']
    },
  },
  plugins: [],
}
