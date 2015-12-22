var express = require('express')
var app = express();

app.set('port', (process.env.PORT || 8080))
app.use(express.static(__dirname + "/src"))


app.listen(app.get('port'), function() {
  console.log("PouchNotes app is running at localhost:" + app.get('port'))
})
