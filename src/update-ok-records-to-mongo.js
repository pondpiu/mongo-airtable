import fs from 'fs'
import path from 'path'
const { readFile, writeFile } = fs.promises
import { MongoClient } from 'mongodb'

export async function updateOKRecordsToMongo({ table }) {
  console.log("\n--> update ok records to mongo")

  const { database, primary } = table
  let { collection } = table
  const client = new MongoClient(`mongodb://localhost:27017`, { useUnifiedTopology: true })
  const connection = await client.connect()
  const db = connection.db(database)
  collection = db.collection(collection)

  const ok_filename = path.resolve(`${__dirname}/../build/${database}/${primary}_airtable_ok.json`)
  let ok_airtable_updates = await readFile(ok_filename, `utf-8`)
  ok_airtable_updates = JSON.parse(ok_airtable_updates)

  console.log(`---> updating ${ok_airtable_updates.length} records in mongo`)
  for (let update of ok_airtable_updates) {
    for (const field in update) {
      if (field === "__id") { continue }
      if (update[field] === null) {
        await collection.updateOne({ __id: update.__id}, { $unset: { [field]: "" }})
      } else {
        await collection.updateOne({ __id: update.__id}, { $set: { [field]: update[field] }}, { upsert: true })
      }
    }
  }

  let all_records = await collection.find({}).toArray()
  all_records = all_records.map((r) => {
    delete r._id
    return r
  })

  const output_filename = path.resolve(`${__dirname}/../build/${database}/${primary}.json`)
  const output_string = JSON.stringify(all_records, null, 2)
  await writeFile(output_filename, output_string, `utf-8`)

  await writeFile(ok_filename, "[]", `utf-8`)

  await connection.close()
}

