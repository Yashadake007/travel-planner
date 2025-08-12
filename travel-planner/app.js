// app.js — small helpers: create spot, list spots, list choices
// Requires firebase.js included before this file.

function appCreateSpot(payload){
  return db.collection('spots').add(payload);
}

function appListSpots(){
  return db.collection('spots').orderBy('departureDate','desc').get().then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
}

function appListChoices(limit = 50){
  return db.collection('userChoices').orderBy('timestamp','desc').limit(limit).get().then(s => s.docs.map(d => ({ id:d.id, ...d.data() })));
}
