(function () {
  "use strict";

  const businessGroups = [
    ["inquiry","询盘沟通",[
      ["Thank you for your inquiry about our product.","感谢您咨询我们的产品。","A1","inquiry","询盘"],
      ["Could you tell us which model you are interested in?","请告诉我们您对哪个型号感兴趣。","A1","model","型号"],
      ["Please share the required quantity with us.","请告知所需数量。","A1","quantity","数量"],
      ["May I know the application of this product?","请问这款产品的用途是什么？","A2","application","用途"],
      ["Could you send us the project specifications?","您可以把项目规格发给我们吗？","A2","specifications","规格要求"],
      ["We need a few more details before making a recommendation.","我们还需要一些细节才能给出建议。","A2","recommendation","建议"],
      ["Is this inquiry for a new project or regular stock?","这次询盘是用于新项目还是常规库存？","B1","regular stock","常规库存"],
      ["Please confirm the destination port for the quotation.","请确认报价所需的目的港。","A2","destination port","目的港"],
      ["We have received your inquiry and will reply today.","我们已收到您的询盘，会在今天回复。","A1","received","收到"],
      ["Could you clarify your target market and certification needs?","您可以说明目标市场和认证要求吗？","B1","target market","目标市场"]
    ]],
    ["quotation","报价沟通",[
      ["Please find our quotation attached.","请查收附件中的报价。","A1","quotation","报价"],
      ["The quoted price is based on one hundred sets.","此报价基于一百套的数量。","A2","quoted price","报价价格"],
      ["The price includes standard export packaging.","价格包含标准出口包装。","A2","export packaging","出口包装"],
      ["Freight is not included in this offer.","本报价不含运费。","A2","freight","运费"],
      ["This quotation is valid for thirty days.","此报价有效期为三十天。","A1","valid","有效的"],
      ["We can offer a better price for a larger quantity.","数量增加时我们可以提供更优惠的价格。","A2","larger quantity","更大数量"],
      ["The unit price depends on the final specification.","单价取决于最终规格。","B1","unit price","单价"],
      ["Could you confirm whether you need an FOB or CIF price?","请确认您需要 FOB 还是 CIF 价格。","B1","FOB","离岸价"],
      ["We have listed the tooling cost separately.","我们已将模具费用单独列出。","B1","tooling cost","模具费用"],
      ["Please let us know if any item needs to be revised.","如有任何项目需要修改，请告诉我们。","A2","revised","修改"]
    ]],
    ["negotiation","价格谈判",[
      ["We understand your target price.","我们理解您的目标价格。","A1","target price","目标价格"],
      ["This is already our best price for this quantity.","这已经是该数量下的最优价格。","A2","best price","最优价格"],
      ["Could you increase the order quantity?","您可以增加订单数量吗？","A1","increase","增加"],
      ["We can review the price if the annual volume is confirmed.","如能确认年度采购量，我们可以重新评估价格。","B1","annual volume","年度采购量"],
      ["The material cost has increased recently.","近期材料成本有所上涨。","A2","material cost","材料成本"],
      ["We prefer to keep the current quality standard.","我们希望保持当前质量标准。","A2","quality standard","质量标准"],
      ["A small discount is possible for full-container orders.","整柜订单可以给予小幅折扣。","B1","discount","折扣"],
      ["Could we meet halfway on the price?","我们可以在价格上各让一步吗？","B1","meet halfway","各让一步"],
      ["The offer is workable only with the revised payment terms.","只有调整付款条件后，这个报价才可行。","B2","workable","可行的"],
      ["Let us check the cost again and reply tomorrow.","我们再核算一次成本，明天回复您。","A2","check the cost","核算成本"]
    ]],
    ["sample","样品沟通",[
      ["We can prepare a sample for your evaluation.","我们可以准备样品供您评估。","A1","evaluation","评估"],
      ["The sample will be ready in five working days.","样品将在五个工作日内完成。","A1","working days","工作日"],
      ["Please confirm the sample color and finish.","请确认样品的颜色和表面处理。","A2","sample finish","样品表面"],
      ["The sample fee can be refunded after the bulk order.","批量订单后可以退还样品费。","B1","sample fee","样品费"],
      ["Could you provide your courier account?","您可以提供快递账号吗？","A2","courier account","快递账号"],
      ["We will send photos before shipping the sample.","寄出样品前我们会发送照片。","A1","shipping","寄送"],
      ["The sample is made to the same standard as production goods.","样品与量产货使用相同标准。","B1","production goods","量产货"],
      ["Please test the sample under actual installation conditions.","请在实际安装条件下测试样品。","B1","installation conditions","安装条件"],
      ["We have included two alternative finishes for comparison.","我们附上了两种备选表面供比较。","B1","alternative finishes","备选表面"],
      ["Please share your feedback after receiving the sample.","收到样品后请分享您的反馈。","A2","feedback","反馈"]
    ]],
    ["order","订单确认",[
      ["Thank you for your purchase order.","感谢您的采购订单。","A1","purchase order","采购订单"],
      ["We are checking the order details now.","我们正在核对订单细节。","A1","order details","订单细节"],
      ["Please confirm the item codes and quantities.","请确认产品编码和数量。","A2","item codes","产品编码"],
      ["The signed proforma invoice is attached.","附件是已签署的形式发票。","A2","proforma invoice","形式发票"],
      ["Production will start after we receive the deposit.","收到定金后我们会开始生产。","A2","deposit","定金"],
      ["Could you approve the final drawing before production?","您可以在生产前确认最终图纸吗？","B1","approve","确认批准"],
      ["We noticed a difference between the order and quotation.","我们发现订单与报价之间有一处差异。","B1","difference","差异"],
      ["Please add your shipping marks to the order.","请把唛头信息补充到订单中。","A2","shipping marks","唛头"],
      ["The order has been entered into our production schedule.","订单已排入生产计划。","B1","production schedule","生产计划"],
      ["We will send the order confirmation within today.","我们会在今天内发送订单确认。","A1","order confirmation","订单确认"]
    ]],
    ["payment","付款沟通",[
      ["Our standard payment term is thirty percent deposit.","我们的标准付款条件是百分之三十定金。","A2","payment term","付款条件"],
      ["The balance is due before shipment.","余款应在出货前支付。","A2","balance","余款"],
      ["Please send us the bank transfer receipt.","请把银行转账回执发给我们。","A1","transfer receipt","转账回执"],
      ["We have not received the payment yet.","我们暂时还没有收到款项。","A1","payment","款项"],
      ["The bank charges should be paid by the buyer.","银行手续费应由买方承担。","B1","bank charges","银行手续费"],
      ["Could you arrange the deposit this week?","您可以在本周安排定金吗？","A2","arrange the deposit","安排定金"],
      ["The payment reference does not match the invoice number.","付款附言与发票号码不一致。","B1","payment reference","付款附言"],
      ["We can accept a letter of credit for large orders.","大额订单我们可以接受信用证。","B1","letter of credit","信用证"],
      ["Please check the beneficiary information carefully.","请仔细核对收款人信息。","A2","beneficiary","收款人"],
      ["We will confirm once the funds reach our account.","款项到账后我们会确认。","A2","funds","资金"]
    ]],
    ["delivery","交期运输",[
      ["The current lead time is about four weeks.","目前交期约为四周。","A1","lead time","交期"],
      ["We expect to finish production next Friday.","我们预计下周五完成生产。","A1","finish production","完成生产"],
      ["The goods are ready for inspection.","货物已经可以验货。","A1","inspection","验货"],
      ["Please confirm your preferred shipping method.","请确认您希望使用的运输方式。","A2","shipping method","运输方式"],
      ["The vessel schedule has changed due to port congestion.","由于港口拥堵，船期发生了变化。","B1","port congestion","港口拥堵"],
      ["We have booked space with the forwarder.","我们已经向货代订舱。","B1","booked space","订舱"],
      ["The estimated departure date is the fifteenth.","预计开船日期是十五号。","A2","departure date","开船日期"],
      ["Could you send us the consignee details?","您可以把收货人信息发给我们吗？","A2","consignee","收货人"],
      ["The shipping documents will be sent after departure.","开船后我们会发送运输单据。","B1","shipping documents","运输单据"],
      ["We will update you if there is any delay.","如有任何延误，我们会及时通知您。","A1","delay","延误"]
    ]],
    ["quality","质量检验",[
      ["All products are inspected before packing.","所有产品在包装前都会检验。","A1","inspected","检验"],
      ["We follow the approved quality standard.","我们按照已确认的质量标准执行。","A2","approved standard","确认标准"],
      ["Please share your inspection checklist.","请分享您的验货清单。","A2","inspection checklist","验货清单"],
      ["The dimensions are within the specified tolerance.","尺寸在规定公差范围内。","B1","tolerance","公差"],
      ["We have completed the function test.","我们已经完成功能测试。","A2","function test","功能测试"],
      ["A third-party inspection can be arranged.","可以安排第三方验货。","B1","third-party inspection","第三方验货"],
      ["The inspection report is attached for your review.","验货报告已附上，供您查看。","A2","inspection report","验货报告"],
      ["We found two pieces with surface scratches.","我们发现两件产品表面有划痕。","B1","surface scratches","表面划痕"],
      ["The defective pieces have been replaced.","有缺陷的产品已经更换。","A2","defective pieces","不良品"],
      ["Please confirm whether the test result is acceptable.","请确认测试结果是否可以接受。","B1","test result","测试结果"]
    ]],
    ["complaint","投诉售后",[
      ["We are sorry to hear about this problem.","很抱歉得知这个问题。","A1","problem","问题"],
      ["Could you send photos of the damaged items?","您可以发送受损产品的照片吗？","A1","damaged items","受损产品"],
      ["Please tell us the quantity affected.","请告诉我们受影响的数量。","A2","affected quantity","受影响数量"],
      ["We are investigating the cause now.","我们正在调查原因。","A2","investigating","调查"],
      ["The issue may have occurred during transportation.","这个问题可能发生在运输过程中。","B1","occurred","发生"],
      ["We will provide replacement parts immediately.","我们会立即提供替换零件。","A2","replacement parts","替换零件"],
      ["Please keep the outer cartons for inspection.","请保留外箱以便检查。","A2","outer cartons","外箱"],
      ["Our technical team will contact you today.","我们的技术团队今天会联系您。","A1","technical team","技术团队"],
      ["We propose a credit note for the defective quantity.","我们建议针对不良数量开具贷项通知单。","B2","credit note","贷项通知单"],
      ["Thank you for giving us the opportunity to correct this.","感谢您给我们机会解决这个问题。","B1","correct","纠正解决"]
    ]],
    ["followup","跟进关系",[
      ["I am following up on our previous quotation.","我想跟进之前的报价。","A1","following up","跟进"],
      ["Have you had a chance to review our offer?","您有时间查看我们的报价了吗？","A2","review our offer","查看报价"],
      ["Please let me know if you need more information.","如果您需要更多信息，请告诉我。","A1","information","信息"],
      ["Is the project still moving forward?","这个项目还在继续推进吗？","A2","moving forward","继续推进"],
      ["We would be happy to revise the proposal.","我们很乐意修改方案。","A2","proposal","方案"],
      ["Could we schedule a short call this week?","我们可以安排本周进行一次简短通话吗？","A2","schedule a call","安排通话"],
      ["We have a new option that may suit your project.","我们有一个可能适合您项目的新方案。","B1","new option","新方案"],
      ["Thank you for your continued cooperation.","感谢您一直以来的合作。","A1","cooperation","合作"],
      ["We hope to develop a long-term partnership.","我们希望建立长期合作关系。","A2","partnership","合作关系"],
      ["Please keep us updated on the project status.","请向我们更新项目进展。","A2","project status","项目状态"]
    ]]
  ];

  const industryGroups = [
    ["glass","玻璃规格",[
      ["Please confirm the glass thickness and type.","请确认玻璃厚度和类型。","A1","glass thickness","玻璃厚度"],
      ["This fitting is suitable for tempered glass.","这款配件适用于钢化玻璃。","A1","tempered glass","钢化玻璃"],
      ["Laminated glass requires a different gasket.","夹胶玻璃需要使用不同的胶垫。","B1","laminated glass","夹胶玻璃"],
      ["The glass edge must be polished before installation.","安装前玻璃边缘必须磨光。","A2","polished edge","磨光边"],
      ["Please mark all hole positions on the drawing.","请在图纸上标出所有孔位。","A2","hole positions","孔位"],
      ["The cut-out size must match our template.","开孔尺寸必须与我们的模板一致。","B1","cut-out size","开孔尺寸"],
      ["The maximum glass panel width is one meter.","玻璃板最大宽度为一米。","A2","panel width","玻璃板宽度"],
      ["Please allow enough clearance around the glass.","请在玻璃周围预留足够间隙。","B1","clearance","间隙"],
      ["The glass weight affects the hardware selection.","玻璃重量会影响五金选型。","B1","glass weight","玻璃重量"],
      ["We recommend a safety film for this application.","我们建议此用途使用安全膜。","B1","safety film","安全膜"]
    ]],
    ["shower","淋浴房铰链",[
      ["This shower hinge opens inward and outward.","这款淋浴房铰链可内外双向开启。","A2","shower hinge","淋浴房铰链"],
      ["The hinge has a self-closing function.","这款铰链具有自动回位功能。","A2","self-closing","自动回位"],
      ["The closing angle can be adjusted.","闭合角度可以调节。","B1","closing angle","闭合角度"],
      ["Two hinges can support a forty-kilogram door.","两个铰链可承重四十公斤的门。","A2","support capacity","承重能力"],
      ["Please use the supplied gaskets on both sides.","请在两侧使用随附的胶垫。","A2","gaskets","胶垫"],
      ["Do not overtighten the fixing screws.","请勿过度拧紧固定螺丝。","B1","fixing screws","固定螺丝"],
      ["The hinge is available in wall-to-glass type.","这款铰链有墙夹玻璃款式。","A2","wall-to-glass","墙夹玻璃"],
      ["We also offer a glass-to-glass version.","我们也提供玻璃夹玻璃款式。","A2","glass-to-glass","玻璃夹玻璃"],
      ["The cover plate hides the mounting screws.","装饰盖可以遮住安装螺丝。","B1","cover plate","装饰盖"],
      ["A salt spray test report is available.","可提供盐雾测试报告。","B1","salt spray test","盐雾测试"]
    ]],
    ["floor","地弹簧",[
      ["This floor spring is designed for heavy glass doors.","这款地弹簧适用于重型玻璃门。","A2","floor spring","地弹簧"],
      ["The maximum door weight is one hundred kilograms.","最大门重为一百公斤。","A1","door weight","门重"],
      ["The closing speed is adjustable in two stages.","关门速度可分两段调节。","B1","closing speed","关门速度"],
      ["The backcheck protects the door from strong impact.","缓冲定位可保护门免受强烈冲击。","B1","backcheck","缓冲定位"],
      ["Please align the spindle with the top pivot.","请将转轴与顶部轴心对齐。","B1","top pivot","顶部轴心"],
      ["The hold-open angle is ninety degrees.","定位角度为九十度。","A2","hold-open angle","定位角度"],
      ["A non-hold-open model is also available.","另有不定位型号可选。","A2","non-hold-open","不定位"],
      ["The cement box must be level with the floor.","水泥盒必须与地面保持水平。","B1","cement box","水泥盒"],
      ["Please protect the valve screws during installation.","安装时请保护调速阀螺丝。","B1","valve screws","调速阀螺丝"],
      ["The cover plate can be removed for adjustment.","可拆下盖板进行调节。","A2","adjustment","调节"]
    ]],
    ["door","玻璃门五金",[
      ["This patch fitting is for a frameless glass door.","这款门夹适用于无框玻璃门。","A1","patch fitting","玻璃门夹"],
      ["The top patch connects to the pivot.","上门夹与轴心连接。","A2","top patch","上门夹"],
      ["The bottom patch connects to the floor spring.","下门夹与地弹簧连接。","A2","bottom patch","下门夹"],
      ["The lock patch accepts a standard euro cylinder.","锁夹适配标准欧式锁芯。","B1","euro cylinder","欧式锁芯"],
      ["The strike patch is installed on the fixed panel.","锁扣夹安装在固定玻璃上。","B1","strike patch","锁扣夹"],
      ["The corner patch joins two glass panels.","转角夹用于连接两块玻璃。","A2","corner patch","转角夹"],
      ["Please confirm the door opening direction.","请确认门的开启方向。","A1","opening direction","开启方向"],
      ["The handle hole spacing is three hundred millimeters.","拉手孔距为三百毫米。","A2","hole spacing","孔距"],
      ["This pull handle has concealed fixings.","这款拉手采用隐藏式固定。","B1","concealed fixings","隐藏式固定"],
      ["The door stopper prevents excessive opening.","门挡可以防止过度开启。","A2","door stopper","门挡"]
    ]],
    ["spigot","栏杆落地夹",[
      ["This spigot is suitable for glass balustrades.","这款落地夹适用于玻璃栏杆。","A1","spigot","栏杆落地夹"],
      ["The square model has a satin finish.","方形款采用拉丝表面。","A1","square model","方形款"],
      ["The rubber inserts protect the glass.","橡胶垫片可以保护玻璃。","A2","rubber inserts","橡胶垫片"],
      ["The clamping pressure can be adjusted.","夹紧压力可以调节。","B1","clamping pressure","夹紧压力"],
      ["No glass drilling is required for this model.","此型号无需在玻璃上钻孔。","A2","glass drilling","玻璃钻孔"],
      ["The base plate is fixed with four anchor bolts.","底板使用四个膨胀螺栓固定。","B1","anchor bolts","膨胀螺栓"],
      ["A cover flange hides the fixing holes.","装饰盖可以遮住固定孔。","B1","cover flange","装饰盖"],
      ["Grade 316 is recommended near the coast.","沿海地区建议使用 316 材质。","A2","grade 316","316 材质"],
      ["Please verify the substrate strength before mounting.","安装前请确认基层强度。","B1","substrate strength","基层强度"],
      ["The handrail should be installed according to local codes.","扶手应按照当地规范安装。","B2","local codes","当地规范"]
    ]],
    ["standoff","驳接件点式固定",[
      ["The standoff diameter is fifty millimeters.","驳接件直径为五十毫米。","A1","standoff diameter","驳接件直径"],
      ["Please confirm the distance from the wall.","请确认离墙距离。","A1","wall distance","离墙距离"],
      ["The threaded rod length can be customized.","螺杆长度可以定制。","A2","threaded rod","螺杆"],
      ["A nylon washer separates the metal from the glass.","尼龙垫片将金属与玻璃隔开。","B1","nylon washer","尼龙垫片"],
      ["The fixing bolt must suit the wall material.","固定螺栓必须适合墙体材料。","B1","fixing bolt","固定螺栓"],
      ["Each panel uses four point fixings.","每块玻璃使用四个点式固定件。","A2","point fixings","点式固定件"],
      ["Please check the glass hole diameter carefully.","请仔细检查玻璃孔径。","A2","hole diameter","孔径"],
      ["The cap can be removed for maintenance.","装饰帽可以拆下维护。","A2","removable cap","可拆装饰帽"],
      ["The load must be transferred to a solid structure.","载荷必须传递到坚固的结构上。","B2","load transfer","载荷传递"],
      ["We can provide a structural calculation guide.","我们可以提供结构计算指南。","B2","structural calculation","结构计算"]
    ]],
    ["sliding","玻璃滑门系统",[
      ["This sliding system is for a single glass door.","这款滑动系统适用于单扇玻璃门。","A1","sliding system","滑动系统"],
      ["The track can be mounted to the wall.","轨道可以安装在墙面上。","A1","wall-mounted track","墙装轨道"],
      ["A ceiling-mounted option is also available.","也可选择天花安装。","A2","ceiling-mounted","天花安装"],
      ["The rollers run quietly inside the track.","滑轮在轨道内安静运行。","A2","rollers","滑轮"],
      ["The soft-close unit slows the door safely.","缓冲器可以安全地降低门速。","B1","soft-close unit","缓冲器"],
      ["Please confirm the opening width.","请确认开启宽度。","A1","opening width","开启宽度"],
      ["The anti-jump device keeps the door on the track.","防跳装置可防止门脱离轨道。","B1","anti-jump device","防跳装置"],
      ["The floor guide prevents the glass from swinging.","地导向器可防止玻璃摆动。","B1","floor guide","地导向器"],
      ["The track length can be cut on site.","轨道长度可以在现场切割。","A2","track length","轨道长度"],
      ["Access panels make maintenance easier.","检修盖板使维护更加方便。","B1","access panels","检修盖板"]
    ]],
    ["material","不锈钢材质表面",[
      ["This part is made of stainless steel 304.","这个零件由 304 不锈钢制成。","A1","stainless steel 304","304 不锈钢"],
      ["Stainless steel 316 has better corrosion resistance.","316 不锈钢具有更好的耐腐蚀性。","A2","corrosion resistance","耐腐蚀性"],
      ["The satin finish has a uniform grain.","拉丝表面具有均匀纹路。","A2","satin finish","拉丝表面"],
      ["The mirror finish requires careful handling.","镜面表面需要小心搬运。","A2","mirror finish","镜面表面"],
      ["PVD coating is available in several colors.","PVD 镀层有多种颜色可选。","B1","PVD coating","PVD 镀层"],
      ["Powder coating is suitable for aluminum parts.","粉末喷涂适用于铝制零件。","B1","powder coating","粉末喷涂"],
      ["Minor shade differences may occur between batches.","不同批次之间可能出现轻微色差。","B1","shade differences","色差"],
      ["The surface should be cleaned with a soft cloth.","表面应使用软布清洁。","A1","soft cloth","软布"],
      ["Avoid cleaners that contain strong acids.","避免使用含强酸的清洁剂。","B1","strong acids","强酸"],
      ["Protective film is applied before packing.","包装前会贴上保护膜。","A2","protective film","保护膜"]
    ]],
    ["installation","安装指导",[
      ["Please read the installation drawing first.","请先阅读安装图纸。","A1","installation drawing","安装图纸"],
      ["Check that all components are included.","检查所有部件是否齐全。","A1","components","部件"],
      ["Make sure the mounting surface is level.","确保安装面水平。","A2","mounting surface","安装面"],
      ["Use a torque wrench to tighten the bolts.","使用扭力扳手拧紧螺栓。","B1","torque wrench","扭力扳手"],
      ["Do not remove the gaskets during installation.","安装时不要取下胶垫。","A2","remove the gaskets","取下胶垫"],
      ["Leave a three-millimeter gap between panels.","玻璃板之间预留三毫米间隙。","A2","panel gap","板间隙"],
      ["Apply neutral silicone around the opening.","在开口周围涂中性硅胶。","B1","neutral silicone","中性硅胶"],
      ["Test the door movement before final tightening.","最终拧紧前测试门的运行。","B1","final tightening","最终拧紧"],
      ["Recheck every fixing point after installation.","安装后重新检查每个固定点。","B1","fixing point","固定点"],
      ["Contact us if any part does not fit correctly.","如果任何零件无法正确安装，请联系我们。","A2","fit correctly","正确安装"]
    ]],
    ["packing","测试包装",[
      ["Each item is packed in an individual box.","每件产品单独装盒。","A1","individual box","单独包装盒"],
      ["Foam inserts protect the polished surfaces.","泡棉内衬可以保护抛光表面。","A2","foam inserts","泡棉内衬"],
      ["The cartons are suitable for sea freight.","纸箱适合海运。","A1","sea freight","海运"],
      ["Wooden pallets are fumigation-free.","木托盘免熏蒸。","A2","fumigation-free","免熏蒸"],
      ["Product labels show the item code and quantity.","产品标签显示产品编码和数量。","A2","product labels","产品标签"],
      ["We perform a load test on every production batch.","每个生产批次都会进行承重测试。","B1","load test","承重测试"],
      ["The salt spray test lasts forty-eight hours.","盐雾测试持续四十八小时。","B1","test duration","测试时长"],
      ["The carton drop test checks packaging strength.","纸箱跌落测试用于检查包装强度。","B1","drop test","跌落测试"],
      ["Spare screws are included in each carton.","每箱都附有备用螺丝。","A2","spare screws","备用螺丝"],
      ["The packing list is placed in the first pallet.","装箱单放在第一托盘内。","A2","packing list","装箱单"]
    ]]
  ];

  function buildPhrases(prefix,topic,module,groups) {
    return groups.flatMap(([category,categoryZh,items])=>items.map(([en,zh,level,word,meaning],index)=>{
      const lower=en.toLowerCase();const clickable=lower.includes(word.toLowerCase())?word:word.split(/\s+/).sort((a,b)=>b.length-a.length).find(part=>part.length>2&&lower.includes(part.toLowerCase()))||word;
      return {id:`${prefix}-${category}-${String(index+1).padStart(2,"0")}`,topic,module,category,categoryZh,scene:categoryZh,en,zh,level,words:[clickable],vocabulary:{word:clickable,meaning}};
    }));
  }

  const businessPhrases=buildPhrases("be","business","business",businessGroups);
  const industryPhrases=buildPhrases("gh","industry","industry",industryGroups);
  const phrases=[...businessPhrases,...industryPhrases];
  const words={};
  phrases.forEach(item=>{words[item.vocabulary.word]=["",item.vocabulary.meaning,{category:item.category,categoryZh:item.categoryZh,level:item.level,sourcePhraseId:item.id,module:item.module}];});

  const dialogSeeds = [
    ["新询盘确认","客户首次询问产品，确认型号和数量。","We are interested in your products.","Could you tell us which model you are interested in?","We need the standard model.","Please pay the balance today.","We may order two hundred pieces.","Please share the required quantity with us.","We need two hundred pieces for the first order.","The sample is already shipped."],
    ["报价条款","客户收到报价后确认价格基础和有效期。","Is this price for one hundred sets?","The quoted price is based on one hundred sets.","Understood. Does it include packing?","The door opens inward.","How long is this quotation valid?","This quotation is valid for thirty days.","Good. We will review it this week.","The glass is tempered."],
    ["价格谈判","客户要求降价，协商数量条件。","Your price is above our target.","We understand your target price.","Can you offer a discount?","Please check the hole diameter.","What if we order a full container?","A small discount is possible for full-container orders.","Please send your revised offer.","The sample color is satin."],
    ["样品安排","客户申请样品并确认寄送。","Can you send us a sample?","We can prepare a sample for your evaluation.","When will it be ready?","The balance is due before shipment.","We need it as soon as possible.","The sample will be ready in five working days.","Please send photos before shipping.","The hinge supports forty kilograms."],
    ["订单核对","收到采购订单后核对细节。","We have sent our purchase order.","Thank you for your purchase order.","Please check all item codes.","The vessel leaves tomorrow.","When can production start?","Production will start after we receive the deposit.","We will arrange the deposit today.","The cover plate is removable."],
    ["付款跟进","跟进定金和银行回执。","We arranged the payment yesterday.","Please send us the bank transfer receipt.","I will send it after this call.","Please confirm the glass thickness.","When will you confirm receipt?","We will confirm once the funds reach our account.","Thank you. Please keep us updated.","The carton is very strong."],
    ["交期确认","客户确认生产和出货时间。","What is the current lead time?","The current lead time is about four weeks.","Can you finish earlier?","This hinge opens both ways.","Please update us before shipment.","We will update you if there is any delay.","That will be helpful.","The surface is mirror polished."],
    ["质量验货","安排检验并说明报告。","Are the goods ready for inspection?","The goods are ready for inspection.","Can you send your internal report first?","We need your courier account.","What does the report include?","The inspection report is attached for your review.","We will check it today.","The track is wall mounted."],
    ["投诉处理","客户反馈运输破损。","Several items arrived damaged.","Could you send photos of the damaged items?","Yes, I will send them now.","Our price is valid for thirty days.","What solution can you provide?","We will provide replacement parts immediately.","Please arrange them urgently.","The glass edge is polished."],
    ["项目跟进","报价后跟进项目状态。","We are still reviewing your proposal.","Please let me know if you need more information.","We need another finish option.","The deposit is thirty percent.","Can we discuss this by phone?","Could we schedule a short call this week?","Thursday afternoon works for us.","The floor spring is adjustable."],
    ["玻璃规格确认","确认钢化玻璃厚度和孔位。","We will use tempered glass.","Please confirm the glass thickness and type.","It is twelve-millimeter tempered glass.","The quotation is attached.","Do you need our drawing?","Please mark all hole positions on the drawing.","We will send it this afternoon.","The order is ready to ship."],
    ["淋浴铰链选型","客户确认铰链功能和承重。","We need hinges for a shower door.","This shower hinge opens inward and outward.","Does it close by itself?","The cartons are fumigation-free.","The door weighs thirty-eight kilograms.","Two hinges can support a forty-kilogram door.","That model should work.","Please pay by letter of credit."],
    ["地弹簧调节","客户咨询闭门速度和定位。","The glass door closes too quickly.","The closing speed is adjustable in two stages.","Can it stay open at ninety degrees?","The sample fee is refundable.","We need a hold-open model.","The hold-open angle is ninety degrees.","Please quote that version.","The spigot is square."],
    ["门夹配置","为无框玻璃门配置门夹。","We need fittings for a frameless door.","This patch fitting is for a frameless glass door.","We also need a lock.","The track can be cut on site.","Which lock cylinder does it use?","The lock patch accepts a standard euro cylinder.","Please include the cylinder.","The sample will take five days."],
    ["落地夹材质","沿海栏杆项目确认材质。","Our project is near the sea.","Grade 316 is recommended near the coast.","Do we need to drill the glass?","The balance is due before shipment.","We prefer a no-drilling solution.","No glass drilling is required for this model.","Please quote the square model.","The hinge has a cover plate."],
    ["驳接件安装","确认孔径和墙体固定。","We need point fixings for a glass wall.","Please check the glass hole diameter carefully.","The wall is made of concrete.","The price includes sea freight.","Which bolt should we use?","The fixing bolt must suit the wall material.","Please send your installation guide.","The finish is available in gold."],
    ["滑门系统","确认滑门开启宽度和缓冲。","We need a sliding glass door.","Please confirm the opening width.","The opening is two meters wide.","The bank receipt is attached.","Can you reduce the closing impact?","The soft-close unit slows the door safely.","Please include two soft-close units.","The glass is laminated."],
    ["表面处理","客户比较拉丝与镜面效果。","Which finish is easier to maintain?","The satin finish has a uniform grain.","Can we also see a mirror sample?","The vessel schedule has changed.","How should we protect the mirror surface?","Protective film is applied before packing.","Please send both samples.","The opening direction is inward."],
    ["安装排查","现场安装后门运行不顺。","The door does not move smoothly.","Make sure the mounting surface is level.","The surface is slightly uneven.","The quotation expires tomorrow.","What should we check next?","Test the door movement before final tightening.","We will loosen and adjust the fixings.","The order quantity is one hundred."],
    ["包装确认","客户确认海运包装和标签。","Is the packaging suitable for sea freight?","The cartons are suitable for sea freight.","How are polished parts protected?","The glass thickness is ten millimeters.","We need item codes on every carton.","Product labels show the item code and quantity.","Good. Please send packing photos.","The floor spring is non-hold-open."]
  ];

  const dialogs={};
  dialogSeeds.forEach((seed,index)=>{const [title,context,c1,g1,r1,b1,c2,g2,r2,b2]=seed;dialogs[`customer-${String(index+1).padStart(2,"0")}`]={title,context,module:"roleplay",level:index<6?"A1":index<15?"A2":"B1",turns:[{customer:c1,choices:[{text:g1,good:true,reply:r1},{text:b1,good:false}]},{customer:c2,choices:[{text:g2,good:true,reply:r2},{text:b2,good:false}]}]};});

  // Course structure is data-driven. Add a chapter here (or through the UI)
  // without changing the catalog renderer.
  const courseTracks=[
    {id:"business",name:"Business English",zh:"基础外贸英语",description:"询盘、报价、订单、交期与售后沟通",icon:"B",chapters:businessGroups.map(([id,zh])=>({id,zh}))},
    {id:"industry",name:"Glass Hardware English",zh:"玻璃五金专业英语",description:"按产品与专业知识逐章学习，可持续扩展新品类",icon:"G",chapters:industryGroups.map(([id,zh])=>({id,zh}))},
    {id:"roleplay",name:"Customer Role Play",zh:"客户情景实战",description:"把课程表达用于真实客户问答与分支训练",icon:"R",chapters:dialogSeeds.map((seed,index)=>({id:`customer-${String(index+1).padStart(2,"0")}`,zh:seed[0]}))}
  ];

  // Three legacy sentences were paraphrases of newer canonical expressions.
  // Their IDs remain valid through the migration map so learning history is kept.
  const phraseAliases={"dr-02":"gh-door-01","st-04":"gh-glass-05","sl-03":"gh-floor-02"};
  const legacyAssignments={
    "sh-01":["industry","shower"],"sh-02":["industry","shower"],"sh-03":["industry","shower"],"sh-04":["industry","shower"],
    "fl-01":["industry","floor"],"fl-02":["industry","floor"],"fl-03":["industry","floor"],"fl-04":["industry","floor"],
    "dr-01":["industry","door"],"dr-02":["industry","door"],"dr-03":["industry","door"],"dr-04":["industry","door"],
    "sp-01":["industry","spigot"],"sp-02":["industry","spigot"],"sp-03":["industry","spigot"],"sp-04":["industry","spigot"],
    "st-01":["industry","standoff"],"st-02":["industry","standoff"],"st-03":["industry","standoff"],"st-04":["industry","standoff"],
    "sl-01":["industry","sliding"],"sl-02":["industry","sliding"],"sl-03":["industry","sliding"],"sl-04":["industry","sliding"],
    "ma-01":["industry","material"],"ma-02":["industry","material"],"ma-03":["industry","material"],"ma-04":["industry","material"],
    "ba-01":["business","inquiry"],"ba-02":["business","inquiry"]
  };

  window.TRADE_TALK_V11={
    version:"1.1",
    modules:{
      business:{name:"Business English",zh:"外贸商务英语",description:"询盘、报价、谈判、订单、交期与售后",icon:"B"},
      industry:{name:"Glass Hardware Industry English",zh:"玻璃五金行业英语",description:"产品、规格、材料、安装、测试与包装",icon:"G"},
      roleplay:{name:"Customer Conversation Role Play",zh:"客户情景对话",description:"20 组真实外贸客户沟通分支",icon:"R"},
      vocabulary:{name:"Vocabulary Bank",zh:"分类词汇库",description:"从 200 条表达中提取并可加入个人生词本",icon:"V"},
      listening:{name:"Listening Speaking Lesson",zh:"听说课程",description:"标准发音、连续听音、录音回听与文字反馈",icon:"L"}
    },
    topics:{business:{name:"Business English",zh:"外贸商务英语",icon:"B",color:"sand"},industry:{name:"Glass Hardware English",zh:"玻璃五金行业英语",icon:"G",color:"mint"}},
    categories:{business:businessGroups.map(([id,zh])=>({id,zh})),industry:industryGroups.map(([id,zh])=>({id,zh}))},
    phrases,words,dialogs,courseTracks,phraseAliases,legacyAssignments,
    vocabulary:Object.entries(words).map(([word,[ipa,meaning,meta]])=>({word,ipa,meaning,...meta}))
  };
})();
