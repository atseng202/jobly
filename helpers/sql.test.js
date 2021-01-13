"use strict";

const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");
// Ask how db knows to connect to test db

describe("sqlForPartialUpdate", function () {
  const jsToSql = {
    numEmployees: "num_employees",
    logoUrl: "logo_url",
  };

  test("Works: dataToUpdate converts several camelCased keys to snakecase and values show up", function () {
    const companyData = { 
      name: "Hey",
      numEmployees: 10, 
      logoUrl: "somethingLogo" 
    };


    expect(sqlForPartialUpdate(companyData, jsToSql)).toEqual(
      {
        setCols: `"name"=$1, "num_employees"=$2, "logo_url"=$3`,
        values: ["Hey", 10, "somethingLogo"]
      });

  });

  test("Works: dataToUpdate converts data with only 1 key to update with value", function () {
    const companyData = {
      name: "one-name",
    };

    expect(sqlForPartialUpdate(companyData, jsToSql)).toEqual({
      setCols: `"name"=$1`,
      values: ["one-name"],
    });
  });


  test("Throws error when no data given", function () {
    expect(() => {
      sqlForPartialUpdate({}, jsToSql);
    }).toThrowError(BadRequestError);
    
  });


});
