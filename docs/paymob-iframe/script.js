document.addEventListener('DOMContentLoaded', function () {
  var number = document.getElementById('number')
  var cleanNumber = document.getElementById('clean-number')
  var expiry = document.getElementById('expiry')
  var expmonth = document.getElementById('expmonth')
  var expyear = document.getElementById('expyear')
  var cvv = document.getElementById('cvv')
  var name = document.getElementById('name')

  // رقم البطاقة: أرقام فقط مع مسافة كل 4 أرقام، والقيمة الخام تُرسل في الحقل المخفي.
  number.addEventListener('input', function (e) {
    var digits = e.target.value.replace(/\D/g, '').slice(0, 16)
    e.target.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ')
    cleanNumber.value = digits
    if (digits.length === 16) expiry.focus()
  })

  // تاريخ الانتهاء بصيغة MM / YY، ويُقسَّم إلى شهر وسنة في الحقول المخفية.
  expiry.addEventListener('input', function (e) {
    var digits = e.target.value.replace(/\D/g, '').slice(0, 4)
    var month = digits.slice(0, 2)
    if (month.length === 2 && Number(month) > 12) month = '12'
    if (month === '00') month = '01'
    var year = digits.slice(2, 4)
    e.target.value = year ? month + ' / ' + year : month
    expmonth.value = month
    expyear.value = year
    if (year.length === 2) cvv.focus()
  })

  expiry.addEventListener('keydown', function (e) {
    if (e.key === 'Backspace' && e.target.value.length === 5) {
      e.preventDefault()
      e.target.value = e.target.value.slice(0, 2)
    }
  })

  cvv.addEventListener('input', function (e) {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4)
  })

  name.addEventListener('input', function (e) {
    e.target.value = e.target.value.toUpperCase()
  })
}, false)
