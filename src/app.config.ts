export default defineAppConfig({
  pages: [
    'pages/pets/index',
    'pages/care/index',
    'pages/report/index',
    'pages/messages/index',
    'pages/stats/index',
    'pages/pet-detail/index',
    'pages/report-detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FFFFFF',
    navigationBarTitleText: '宠物寄养管家',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#FF7A45',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/pets/index',
        text: '宠物档案'
      },
      {
        pagePath: 'pages/care/index',
        text: '今日照护'
      },
      {
        pagePath: 'pages/report/index',
        text: '异常上报'
      },
      {
        pagePath: 'pages/messages/index',
        text: '消息中心'
      },
      {
        pagePath: 'pages/stats/index',
        text: '经营统计'
      }
    ]
  }
})
