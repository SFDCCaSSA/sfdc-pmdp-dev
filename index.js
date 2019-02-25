const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

var app = express();
var bodyParser = require('body-parser');
require('body-parser-xml')(bodyParser);

app.use(bodyParser.xml());

app
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/logos', async (req, res) => {

    res.render('pages/logos');
  })
  .get('/', async (req, res) => {
    try {
      const client = await pool.connect();
      const results = await client.query("SELECT * FROM videos WHERE tipo__c = 'Inicio' and estatus__c='Activo' order by nube__c, id asc");
      const configPage = await client.query("SELECT * FROM configportal WHERE name = 'Inicio' limit 1");
      //console.log(results);
      console.log(configPage);
      res.render('pages/index', {results : results, "configPage" : configPage.rows[0], filtros : generaFiltros(results)});
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })
  .get('/microdemos', async (req, res) => {
    try {
      const client = await pool.connect();
      //const results = await client.query('SELECT * FROM microdemos order by nube, id asc');
      const results = await client.query("SELECT * FROM videos WHERE tipo__c = 'Microdemo' and estatus__c='Activo' order by nube__c, id asc");
      const configPage = await client.query("SELECT * FROM configportal WHERE name = 'Microdemo' limit 1");
      //console.log(results);
      //console.log(configPage);
      res.render('pages/vistaVideo', {results : results, "configPage" : configPage.rows[0], filtros : generaFiltros(results)});
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })
  .get('/webinars', async (req, res) => {
    try {
      const client = await pool.connect();
      //const results = await client.query('SELECT * FROM webinars order by nube, id asc');
      const results = await client.query("SELECT * FROM videos WHERE tipo__c = 'Webinar' and estatus__c='Activo' order by nube__c, id asc");
      const configPage = await client.query("SELECT * FROM configportal WHERE name = 'Webinar' limit 1");
      //console.log(results);
      //console.log(configPage);
      res.render('pages/vistaVideo', {results : results, configPage : configPage.rows[0], filtros : generaFiltros(results)});
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })
  .get('/exitos', async (req, res) => {
    try {
      const client = await pool.connect();
      //const results = await client.query('SELECT * FROM webinars order by nube, id asc');
      const results = await client.query("SELECT * FROM videos WHERE tipo__c = 'Caso Exito' and estatus__c='Activo' order by nube__c, id asc");
      const configPage = await client.query("SELECT * FROM configportal WHERE name = 'Caso Exito' limit 1");
      //console.log(results);
      //console.log(configPage);
      res.render('pages/vistaVideo', {results : results, configPage : configPage.rows[0], filtros : generaFiltros(results)});
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })
  .get('/search', async (req, res) => {
    try {
      var keywords = req.param('keywords');
      const client = await pool.connect();
      //const results = await client.query('SELECT * FROM webinars order by nube, id asc');
      const results = await client.query("SELECT * FROM videos WHERE LOWER(name) like LOWER('%" + keywords + "%') and estatus__c='Activo' order by nube__c, id asc");
      const configPage = await client.query("SELECT * FROM configportal WHERE name = 'Busqueda' limit 1");
      //console.log(results);
      //console.log(configPage);
      res.render('pages/vistaVideo', {results : results, configPage : configPage.rows[0], filtros : generaFiltros(results),keywords: keywords});
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })
  .post("/upsertVideo", function(req, res) {
    var datas = parseRequest(req);
    for(let i=0 ; i < datas.length ; i++){
      upsertVideo(datas[i]);
    }
    res.contentType('application/xml');
    res.send(
      '<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body><notificationsResponse xmlns="http://soap.sforce.com/2005/09/outbound"><Ack>true</Ack></notificationsResponse></soapenv:Body></soapenv:Envelope>',
      200
    );
    //res.status(201).end();
  })
  .post("/upsertConfigPortal", function(req, res) {
    var datas = parseRequest(req);
    for(let i=0 ; i < datas.length ; i++){
      upsertCP(datas[i]);
    }
    res.contentType('application/xml');
    res.send(
      '<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body><notificationsResponse xmlns="http://soap.sforce.com/2005/09/outbound"><Ack>true</Ack></notificationsResponse></soapenv:Body></soapenv:Envelope>',
      200
    );
    //res.status(201).end();
  })
  .listen(PORT, () => console.log("Listening on ${PORT}",PORT));


parseRequest = function(req){
    var regs = [];
    //console.log("req.body",JSON.stringify(req.body));
    var notification = req.body["soapenv:Envelope"]["soapenv:Body"][0]["notifications"][0];
    var sessionId = notification["SessionId"][0];
    if (notification["Notification"] !== undefined) {
      for (let i = 0; i < notification["Notification"].length; i++) {
        var data = {};
        var sobject = notification["Notification"][i]["sObject"][0];
        Object.keys(sobject).forEach(function(key) {
          if (key.indexOf("sf:") == 0) {
            var newKey = key.substr(3);
            data[newKey] = sobject[key][0];
          }
        }); 
        regs.push(data);
      }
    }
    return regs;
};

var promise = require('bluebird');

var options = {
  promiseLib: promise
};
var pgp = require('pg-promise')(options);
var connectionString = process.env.DATABASE_URL;
var db = pgp(connectionString);

upsertVideo = function(data){
    console.log("data param: " + JSON.stringify(data));
    var dataString = JSON.stringify(data);
    db.tx(t => {
      var campos = "";
      var valores = "";
      
      if(data.Name !== undefined){
        campos += ",name";
        valores += ",${Name}";
      }
      if(data.DescripcionCorta__c !== undefined){
        campos += ",descripcioncorta__c";
        valores += ",${DescripcionCorta__c}";
      }
      if(data.Estatus__c !== undefined){
        campos += ",estatus__c";
        valores += ",${Estatus__c}";
      }
      if(data.Fecha__c !== undefined){
        campos += ",fecha__c";
        valores += ",${Fecha__c}";
      }
      if(data.Liga__c !== undefined){
        campos += ",liga__c";
        valores += ",${Liga__c}";
      }
      if(data.Nube__c !== undefined){
        campos += ",nube__c";
        valores += ",${Nube__c}";
      }
      if(data.Tipo__c !== undefined){
        campos += ",tipo__c";
        valores += ",${Tipo__c}";
      }
      if(data.Rol__c !== undefined){
        campos += ",rol__c";
        valores += ",${Rol__c}";
      }
      if(data.Tags__c !== undefined){
        campos += ",tags__c";
        valores += ",${Tags__c}";
      }
      if(data.CardHeaderBgColor__c !== undefined){
        campos += ",cardheaderbgcolor__c";
        valores += ",${CardHeaderBgColor__c}";
      }
      if(data.CardHeaderIcon__c !== undefined){
        campos += ",cardheadericon__c";
        valores += ",${CardHeaderIcon__c}";
      }
      if(data.ImpartidoPor__c !== undefined){
        campos += ",impartidopor__c";
        valores += ",${ImpartidoPor__c}";
      }

      var query = "INSERT INTO videos(id" + campos + ") VALUES (${Id}" + valores + ") ON CONFLICT (id) DO UPDATE SET (" + (campos.substring(0,1)==","?campos.substring(1):campos) + ") = (" + (valores.substring(0,1)==","?valores.substring(1):valores) + ") WHERE videos.id = ${Id}";
      console.log('Query:', query);
      const q1 = t.none(
          query
        , data
      );
      return t.batch([q1]); // all of the queries are to be resolved;
    })
    .then(data => {
        // success, COMMIT was executed
        console.log('success upsertVideo');
    })
    .catch(error => {
        console.error('ERROR:', error);
        console.error("error upsertVideo Video");
        console.error(error);
        return (500,JSON.stringify({"Error":true,"Data":data}));
    });
};

upsertCP = function(data){
    console.log("data param: " + JSON.stringify(data));
    var dataString = JSON.stringify(data);
    db.tx(t => {
      const q1 = t.none(
        'INSERT INTO configportal(id,name,titulo__c,subtitulo__c) VALUES (${Id},${Name},${Titulo__c},${Subtitulo__c}) ON CONFLICT (id) DO UPDATE SET (name,titulo__c,subtitulo__c) = (${Name},${Titulo__c},${Subtitulo__c}) WHERE configportal.id = ${Id}'
        , data
      );
      return t.batch([q1]); // all of the queries are to be resolved;
    })
    .then(data => {
        // success, COMMIT was executed
        console.log('success upsert Configportal');
    })
    .catch(error => {
        console.error('ERROR:', error);
        console.error("error upsert Configportal");
        console.error(error);
        return (500,JSON.stringify({"Error":true,"Data":data}));
    });
};

generaFiltros = function(results){
  var filtros = {"roles":[],"niveles":[],"nubes":[],"tags":[]};

  for (var j = 0; j < results.rows.length; j++) {
    var fila = results.rows[j];
    var roles = fila.rol__c==null?"":fila.rol__c.split(";");
    //var niveles = fila.nivel__c.split(";");
    var nubes = fila.nube__c==null?"":fila.nube__c.split(";");
    var tags = fila.tags__c==null?"":fila.tags__c.split(";");
    console.log("tags",tags);
    fila.filtros = "";
    for (var i = 0; i < roles.length; i++) {
      filtros.roles.push(roles[i]);
      fila.filtros += " filter-rol-" + roles[i].replace(/ /g , "-");
    }
    //for (var i = 0; i < niveles.length; i++) {
      //filtros.niveles.push(niveles[i]);
      //fila.filtros += " filter-nivel-" + niveles[i].replace(/ /g , "-");
    //}
    for (var i = 0; i < nubes.length; i++) {
      filtros.nubes.push(nubes[i]);
      fila.filtros += " filter-nube-" + nubes[i].replace(/ /g , "-");
    }
    for (var i = 0; i < tags.length; i++) {
      filtros.tags.push(tags[i]);
      fila.filtros += " filter-tag-" + tags[i].replace(/ /g , "-");
    }
  }
  console.log(filtros);
  filtros.roles = removeDuplicateUsingSet(filtros.roles);
  //filtros.niveles = removeDuplicateUsingSet(filtros.niveles);
  filtros.nubes = removeDuplicateUsingSet(filtros.nubes);
  filtros.tags = removeDuplicateUsingSet(filtros.tags);
  console.log(filtros);
  return filtros;
}

function removeDuplicateUsingSet(arr){
    let unique_array = Array.from(new Set(arr))
    return unique_array
}
