window.TRADE_TALK_CONTENT = {
  topics: {
    shower: { name: "Shower Hinges", zh: "淋浴房铰链", icon: "H", color: "mint" },
    floor: { name: "Floor Springs", zh: "地弹簧", icon: "F", color: "sand" },
    door: { name: "Glass Door Hardware", zh: "玻璃门五金", icon: "D", color: "blue" },
    spigot: { name: "Balustrade Spigots", zh: "栏杆落地夹", icon: "S", color: "violet" },
    standoff: { name: "Standoffs / Point Fixings", zh: "驳接件 / 点式固定", icon: "P", color: "coral" },
    sliding: { name: "Glass Sliding Systems", zh: "玻璃滑门系统", icon: "G", color: "sky" },
    finish: { name: "Materials & Finishes", zh: "不锈钢材质与表面", icon: "M", color: "olive" }
  },
  phrases: [
    {id:"sh-01",topic:"shower",scene:"询盘确认",en:"Could you confirm the glass thickness?",zh:"请确认玻璃厚度好吗？",level:"A1",words:["confirm","thickness"]},
    {id:"sh-02",topic:"shower",scene:"产品选型",en:"This hinge is suitable for 8 to 12 mm glass.",zh:"这款铰链适用于 8 至 12 毫米玻璃。",level:"A2",words:["hinge","suitable"]},
    {id:"sh-03",topic:"shower",scene:"技术沟通",en:"The door can open inward and outward.",zh:"门可以向内和向外开启。",level:"A2",words:["inward","outward"]},
    {id:"sh-04",topic:"shower",scene:"安装指导",en:"Please make sure the cut-outs match the drawing.",zh:"请确保开孔与图纸一致。",level:"B1",words:["cut-outs","drawing"]},
    {id:"fl-01",topic:"floor",scene:"需求确认",en:"What is the weight of the glass door?",zh:"玻璃门的重量是多少？",level:"A1",words:["weight"]},
    {id:"fl-02",topic:"floor",scene:"产品选型",en:"This floor spring supports doors up to 120 kilograms.",zh:"这款地弹簧支持重达 120 公斤的门。",level:"A2",words:["supports","kilograms"]},
    {id:"fl-03",topic:"floor",scene:"功能说明",en:"The closing speed can be adjusted on site.",zh:"关门速度可以在现场调节。",level:"B1",words:["closing","adjusted"]},
    {id:"fl-04",topic:"floor",scene:"售后排查",en:"Please check whether the spindle is aligned correctly.",zh:"请检查转轴是否正确对齐。",level:"B1",words:["spindle","aligned"]},
    {id:"dr-01",topic:"door",scene:"询盘确认",en:"Do you need a lock patch or a strike patch?",zh:"您需要锁夹还是锁扣夹？",level:"A2",words:["lock patch","strike patch"]},
    {id:"dr-02",topic:"door",scene:"产品介绍",en:"The patch fitting is designed for frameless glass doors.",zh:"这款门夹专为无框玻璃门设计。",level:"A2",words:["patch fitting","frameless"]},
    {id:"dr-03",topic:"door",scene:"报价说明",en:"The price includes standard export packaging.",zh:"价格包含标准出口包装。",level:"A2",words:["includes","packaging"]},
    {id:"dr-04",topic:"door",scene:"交期沟通",en:"The lead time is approximately twenty-five days.",zh:"交期大约为二十五天。",level:"B1",words:["lead time","approximately"]},
    {id:"sp-01",topic:"spigot",scene:"需求确认",en:"Do you prefer a round or square spigot?",zh:"您更喜欢圆形还是方形落地夹？",level:"A1",words:["prefer","spigot"]},
    {id:"sp-02",topic:"spigot",scene:"材质说明",en:"We recommend stainless steel 316 for coastal projects.",zh:"沿海项目我们建议使用 316 不锈钢。",level:"B1",words:["stainless steel","coastal"]},
    {id:"sp-03",topic:"spigot",scene:"安装指导",en:"The spigot can be surface-mounted without drilling the glass.",zh:"这款落地夹可表面安装，无需在玻璃上钻孔。",level:"B1",words:["surface-mounted","drilling"]},
    {id:"sp-04",topic:"spigot",scene:"样品确认",en:"We can send a sample before mass production.",zh:"我们可以在批量生产前寄送样品。",level:"A2",words:["sample","mass production"]},
    {id:"st-01",topic:"standoff",scene:"规格确认",en:"Please confirm the diameter and projection.",zh:"请确认直径和离墙距离。",level:"B1",words:["diameter","projection"]},
    {id:"st-02",topic:"standoff",scene:"安装说明",en:"Each panel is fixed with four standoffs.",zh:"每块玻璃板由四个驳接件固定。",level:"A2",words:["panel","standoffs"]},
    {id:"st-03",topic:"standoff",scene:"安全说明",en:"The fixing substrate must be strong enough.",zh:"固定基层必须足够牢固。",level:"B1",words:["substrate","strong enough"]},
    {id:"st-04",topic:"standoff",scene:"图纸确认",en:"Could you mark the hole positions on the drawing?",zh:"您可以在图纸上标注孔位吗？",level:"A2",words:["mark","positions"]},
    {id:"sl-01",topic:"sliding",scene:"需求确认",en:"How many sliding panels do you need?",zh:"您需要多少扇滑动玻璃？",level:"A1",words:["sliding","panels"]},
    {id:"sl-02",topic:"sliding",scene:"产品选型",en:"The soft-close system reduces impact and noise.",zh:"缓冲关闭系统可减少冲击和噪音。",level:"B1",words:["soft-close","impact"]},
    {id:"sl-03",topic:"sliding",scene:"承重说明",en:"The maximum door weight is 100 kilograms.",zh:"最大门重为 100 公斤。",level:"A2",words:["maximum","door weight"]},
    {id:"sl-04",topic:"sliding",scene:"安装确认",en:"Please check the ceiling structure before installation.",zh:"安装前请检查天花结构。",level:"B1",words:["ceiling","installation"]},
    {id:"ma-01",topic:"finish",scene:"表面确认",en:"Which finish would you like: satin or mirror?",zh:"您需要哪种表面：拉丝还是镜面？",level:"A2",words:["satin","mirror"]},
    {id:"ma-02",topic:"finish",scene:"材质说明",en:"Grade 316 offers better corrosion resistance.",zh:"316 材质具有更好的耐腐蚀性。",level:"B1",words:["grade","corrosion resistance"]},
    {id:"ma-03",topic:"finish",scene:"色差沟通",en:"There may be a slight color difference between batches.",zh:"不同批次之间可能存在轻微色差。",level:"B1",words:["slight","batches"]},
    {id:"ma-04",topic:"finish",scene:"质检确认",en:"We will check the surface before packing.",zh:"包装前我们会检查表面。",level:"A2",words:["surface","packing"]},
    {id:"ba-01",topic:"door",scene:"基础英语",en:"Thanks for your message. I will check and get back to you today.",zh:"感谢您的消息。我会确认并在今天回复您。",level:"A1",words:["get back to you"]},
    {id:"ba-02",topic:"door",scene:"基础英语",en:"Could you say that again a little more slowly?",zh:"您可以再说一遍并稍微慢一点吗？",level:"A1",words:["slowly"]}
  ],
  words: {
    confirm:["/kənˈfɜːm/","确认"], thickness:["/ˈθɪk.nəs/","厚度"], hinge:["/hɪndʒ/","铰链"], suitable:["/ˈsuː.tə.bəl/","合适的"], inward:["/ˈɪn.wəd/","向内"], outward:["/ˈaʊt.wəd/","向外"], "cut-outs":["/ˈkʌt.aʊts/","开孔"], drawing:["/ˈdrɔː.ɪŋ/","图纸"], weight:["/weɪt/","重量"], supports:["/səˈpɔːts/","支撑；承重"], kilograms:["/ˈkɪl.ə.ɡræmz/","公斤"], closing:["/ˈkləʊ.zɪŋ/","关闭"], adjusted:["/əˈdʒʌs.tɪd/","调节"], spindle:["/ˈspɪn.dəl/","转轴"], aligned:["/əˈlaɪnd/","对齐的"], "lock patch":["/lɒk pætʃ/","锁夹"], "strike patch":["/straɪk pætʃ/","锁扣夹"], "patch fitting":["/pætʃ ˈfɪt.ɪŋ/","玻璃门夹"], frameless:["/ˈfreɪm.ləs/","无框的"], includes:["/ɪnˈkluːdz/","包含"], packaging:["/ˈpæk.ɪ.dʒɪŋ/","包装"], "lead time":["/ˈliːd taɪm/","交期"], approximately:["/əˈprɒk.sɪ.mət.li/","大约"], prefer:["/prɪˈfɜː/","更喜欢"], spigot:["/ˈspɪɡ.ət/","栏杆落地夹"], "stainless steel":["/ˌsteɪn.ləs ˈstiːl/","不锈钢"], coastal:["/ˈkəʊ.stəl/","沿海的"], "surface-mounted":["/ˈsɜː.fɪs ˌmaʊn.tɪd/","表面安装的"], drilling:["/ˈdrɪl.ɪŋ/","钻孔"], sample:["/ˈsɑːm.pəl/","样品"], "mass production":["/ˌmæs prəˈdʌk.ʃən/","批量生产"], diameter:["/daɪˈæm.ɪ.tər/","直径"], projection:["/prəˈdʒek.ʃən/","凸出距离"], panel:["/ˈpæn.əl/","板；玻璃板"], standoffs:["/ˈstænd.ɒfs/","驳接件"], substrate:["/ˈsʌb.streɪt/","基层"], "strong enough":["/strɒŋ ɪˈnʌf/","足够牢固"], mark:["/mɑːk/","标注"], positions:["/pəˈzɪʃ.ənz/","位置"], sliding:["/ˈslaɪ.dɪŋ/","滑动的"], panels:["/ˈpæn.əlz/","玻璃板"], "soft-close":["/ˌsɒft ˈkləʊz/","缓冲关闭"], impact:["/ˈɪm.pækt/","冲击"], maximum:["/ˈmæk.sɪ.məm/","最大值"], "door weight":["/dɔː weɪt/","门重"], ceiling:["/ˈsiː.lɪŋ/","天花板"], installation:["/ˌɪn.stəˈleɪ.ʃən/","安装"], satin:["/ˈsæt.ɪn/","拉丝；缎面"], mirror:["/ˈmɪr.ər/","镜面"], grade:["/ɡreɪd/","牌号；等级"], "corrosion resistance":["/kəˈrəʊ.ʒən rɪˈzɪs.təns/","耐腐蚀性"], slight:["/slaɪt/","轻微的"], batches:["/ˈbætʃ.ɪz/","批次"], surface:["/ˈsɜː.fɪs/","表面"], packing:["/ˈpæk.ɪŋ/","包装"], "get back to you":["/ɡet bæk tə juː/","回复你"], slowly:["/ˈsləʊ.li/","缓慢地"]
  },
  dialogs: {
    shower:{title:"淋浴房铰链",context:"新客户询问无框淋浴门铰链。先确认玻璃厚度，再说明适配范围。",turns:[
      {customer:"Hi, I'm looking for hinges for a frameless shower door.",choices:[{text:"Could you confirm the glass thickness?",good:true,reply:"It is 10 mm tempered glass."},{text:"Our price is very good.",good:false}]},
      {customer:"It is 10 mm tempered glass. Will this model fit?",choices:[{text:"This hinge is suitable for 8 to 12 mm glass.",good:true,reply:"Great. Please send me the drawing."},{text:"The packaging is brown cartons.",good:false}]}
    ]},
    floor:{title:"地弹簧选型",context:"客户需要为玻璃门选择地弹簧。先确认门重，再说明承重范围。",turns:[
      {customer:"Can you recommend a floor spring for our glass door?",choices:[{text:"What is the weight of the glass door?",good:true,reply:"The door weighs about 105 kilograms."},{text:"The closing speed can be adjusted on site.",good:false}]},
      {customer:"The door weighs about 105 kilograms.",choices:[{text:"This floor spring supports doors up to 120 kilograms.",good:true,reply:"That sounds suitable. Please quote 20 sets."},{text:"Please check whether the spindle is aligned correctly.",good:false}]}
    ]},
    door:{title:"玻璃门五金询盘",context:"客户询问无框玻璃门五金。确认门夹类型，并说明产品用途。",turns:[
      {customer:"We need hardware for a frameless glass door.",choices:[{text:"Do you need a lock patch or a strike patch?",good:true,reply:"We need both for a double door."},{text:"The lead time is approximately twenty-five days.",good:false}]},
      {customer:"We need both for a double door.",choices:[{text:"The patch fitting is designed for frameless glass doors.",good:true,reply:"Good. Please include them in your quotation."},{text:"Could you say that again a little more slowly?",good:false}]}
    ]},
    spigot:{title:"栏杆落地夹",context:"客户为沿海栏杆项目采购落地夹。确认外形，并推荐合适材质。",turns:[
      {customer:"We need spigots for a glass balustrade project.",choices:[{text:"Do you prefer a round or square spigot?",good:true,reply:"We prefer the square type."},{text:"We can send a sample before mass production.",good:false}]},
      {customer:"The project is close to the sea.",choices:[{text:"We recommend stainless steel 316 for coastal projects.",good:true,reply:"Understood. Please quote the 316 grade."},{text:"The spigot can be surface-mounted without drilling the glass.",good:false}]}
    ]},
    standoff:{title:"驳接件规格确认",context:"客户采购玻璃驳接件。确认尺寸，并核对图纸孔位。",turns:[
      {customer:"We need standoffs for a glass wall.",choices:[{text:"Please confirm the diameter and projection.",good:true,reply:"The diameter is 50 mm and the projection is 30 mm."},{text:"Each panel is fixed with four standoffs.",good:false}]},
      {customer:"I will send you our panel drawing.",choices:[{text:"Could you mark the hole positions on the drawing?",good:true,reply:"Yes, I will mark every hole clearly."},{text:"The fixing substrate must be strong enough.",good:false}]}
    ]},
    sliding:{title:"玻璃滑动系统",context:"客户规划玻璃滑动门。确认门扇数量，再说明缓冲功能。",turns:[
      {customer:"We are planning a glass sliding door system.",choices:[{text:"How many sliding panels do you need?",good:true,reply:"We need three sliding panels."},{text:"The maximum door weight is 100 kilograms.",good:false}]},
      {customer:"Noise is a concern for this project.",choices:[{text:"The soft-close system reduces impact and noise.",good:true,reply:"Excellent. Please include soft-close in the offer."},{text:"Please check the ceiling structure before installation.",good:false}]}
    ]},
    finish:{title:"材质与表面",context:"客户确认不锈钢五金的表面与材质。确认表面要求并解释 316 优势。",turns:[
      {customer:"We need stainless steel hardware for a hotel project.",choices:[{text:"Which finish would you like: satin or mirror?",good:true,reply:"We prefer a satin finish."},{text:"We will check the surface before packing.",good:false}]},
      {customer:"The hotel is in a coastal city.",choices:[{text:"Grade 316 offers better corrosion resistance.",good:true,reply:"Then please quote grade 316."},{text:"There may be a slight color difference between batches.",good:false}]}
    ]}
  }
};
