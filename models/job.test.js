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
    expect(job).toEqual({
      ...newJob,
      id: expect.any(Number)
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'job1'`
    );
   
    expect(result.rows).toEqual([
      {
        id: expect.any(Number),
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

/************************************** findAll */

// works: NO filter
// works: WITH ONE filter
// works: WITH MULTIPLE filter
// works: returns where minSalary is in bounds 
// works: returns jobs where equity true & > 0
// works: returns jobs where equity false

describe("findAll", function () {
  test("works: NO filter", async function () {
    let jobs = await Job.findAll({});

    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "jobA",
        salary: 100000,
        equity: "0.0",
        companyHandle: "c1",
      },
      {
        id: expect.any(Number),
        title: "jobB",
        salary: 200000,
        equity: "0.2",
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: "jobC",
        salary: 300000,
        equity: null,
        companyHandle: "c3",
      },
    ]);
  });
  
  test("works: WITH ONE filter", async function () {
    let queryFilter = {
      title: "A"
    }
    let jobs = await Job.findAll(queryFilter);
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "jobA",
        salary: 100000,
        equity: "0.0",
        companyHandle: "c1",
      },
    ]);
  });
  
  test("works: WITH MULTIPLE filter", async function () {
    let queryFilter = {
      title: "job",
      minSalary: 150000
    }
    let jobs = await Job.findAll(queryFilter);
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "jobB",
        salary: 200000,
        equity: "0.2",
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: "jobC",
        salary: 300000,
        equity: null,
        companyHandle: "c3",
      },
    ]);
  });
  
  test("works: returns only in bounds ", async function () {
    let queryFilter = {
      minSalary: 350000
    }
    let jobs = await Job.findAll(queryFilter);
    expect(jobs).toEqual([]);
  });

  test("works: returns jobs where equity true & > 0 (hasEquity true)", async function () {
    let queryFilter = {
      hasEquity: true
    }
    let jobs = await Job.findAll(queryFilter);
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "jobB",
        salary: 200000,
        equity: "0.2",
        companyHandle: "c2",
      },
    ]);
  });
  
  test("works: returns jobs where hasEquity false", async function () {
    let queryFilter = {
      hasEquity: false
    }
    let jobs = await Job.findAll(queryFilter);
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "jobA",
        salary: 100000,
        equity: "0.0",
        companyHandle: "c1",
      },
      {
        id: expect.any(Number),
        title: "jobB",
        salary: 200000,
        equity: "0.2",
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: "jobC",
        salary: 300000,
        equity: null,
        companyHandle: "c3",
      },
    ]);
  });
  // END
});

/************************************** update */

// works
// works: null fields
// not found if no such company
// bad request with no data

describe("update", function () {
  
  const updateData = {
    title: "jobC",
    salary: 350000,
    equity: null,
    companyHandle: "c3",
  };

  let jobC;

  beforeAll( async function () {
    const jobCResult = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs
            WHERE title = $1`,
      ["jobC"]
    );
    jobC = jobCResult.rows[0];
  });
  
  test("works", async function () {


    let job = await Job.update(jobC.id, updateData);

    expect(job).toEqual({
      id: jobC.id,
      ...updateData,
    });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`,
      [jobC.id]
    );
    expect(result.rows).toEqual([
      {
        title: "jobC",
        salary: 350000,
        equity: null,
        companyHandle: "c3"
      },
    ]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "jobC",
      salary: null,
      equity: null,
      companyHandle: "c3"
    };

    let job  = await Job.update(jobC.id, updateDataSetNulls);
    expect(job).toEqual({
      id: jobC.id,
      ...updateDataSetNulls,
    });

   const result = await db.query(
     `SELECT id, title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`,
     [jobC.id]
   );
   
    expect(result.rows).toEqual([
      {
        id: jobC.id,
        title: "jobC",
        salary: null,
        equity: null,
        companyHandle: "c3"
      }
    ]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(jobC.id + 100, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(jobC.id, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
  // END
});

/************************************** remove */

// works
// not found if no such Job

describe("remove", function () {
  let jobC;
  beforeAll( async function () {
    const jobCResult = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs
            WHERE title = $1`,
      ["jobC"]
    );
    jobC = jobCResult.rows[0];
  });

  test("works", async function () {
    await Job.remove(jobC.id);
    const res = await db.query(
        "SELECT id FROM jobs WHERE id=$1", [jobC.id]);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such Job", async function () {
    try {
      await Job.remove(jobC.id + 100);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});