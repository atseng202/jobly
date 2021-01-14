"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require('./job.js');
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

// works

describe("create", function () {
  // equity is returned from pg query as a String because Numeric type
  // can store very large numbers in db and only a String can hold that much
  // numerical places with precision at the expense of speed
  const newJob = {
    title: "job1",
    salary: 150000,
    equity: '0.1',
    companyHandle: "c1"
  };

  test("works", async function () {
    const job = await Job.create(newJob);
    expect(job).toEqual(newJob);

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'job1'`
    );
   
    expect(result.rows).toEqual([
      {
        title: "job1",
        salary: 150000,
        equity: '0.1',
        companyHandle: "c1",
      },
    ]);
  });

  // If there is another bad request we can think of, we will add

  //end
});

