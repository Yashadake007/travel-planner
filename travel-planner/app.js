// app.js — helpers for create/admin pages

function appCreateSpot(payload){
  return db.collection('spots').add(payload);
}

function appListSpots(){
  return db.collection('spots').orderBy('departureDate','desc').get().then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
}

function appListChoices(limit = 50){
  return db.collection('userChoices').orderBy('timestamp','desc').limit(limit).get().then(s => s.docs.map(d => ({ id:d.id, ...d.data() })));
}
