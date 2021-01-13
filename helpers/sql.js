"use strict";

const { BadRequestError } = require("../expressError");

/** 
 * Function takes dataToUpdate keys and returns a new object
 * where the keys are *setCols*, a string of columns to update with 
 * parameterized/sanitized queries, and *values*, to update the 
 * table columns with
 * 
 * dataToUpdate: the columns of table model mapped with new values to update in db
 * jsToSql: maps table columns that are camelCase to their snake_case strings 
 **/  

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
