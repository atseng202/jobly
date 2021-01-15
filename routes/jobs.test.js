"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

// ok for users who are admin
// bad request with missing data
// bad request with invalid data
// unauthorized request when logged in but not admin
// unauthorized for anon

describe("POST /jobs", function () {
  const newJob = {
    title: "newJob",
    salary: 50000,
    equity: "0.3",
    companyHandle: "c1"
  };

  const newJobWontWork = {
    salary: "hello",
    companyHandle: "c1"
  };

  test("ok for users who are admin", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: "newJob",
        salary: 50000,
        equity: "0.3",
        companyHandle: "c1"
      },
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "newJob",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          ...newJobWontWork
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  // pessimistic test
  test("unauthorized request when not admin", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });
  
  test("unauthorized request when not admin", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob);
    expect(resp.statusCode).toEqual(401);
  });
  //end
});

/************************************** GET /jobs */

// ok for anon
// produces correct results when given ONE filter
// produces correct results when given MANY filters
// fails: test next() handler
// fails: throws error when equity > 1

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
      [
        {
          id: expect.any(Number),
          title: "jobA",
          salary: 100000,
          equity: '0.0',
          companyHandle: "c1"
        },
        {
          id: expect.any(Number),
          title: "jobB",
          salary: 200000,
          equity: '0.2',
          companyHandle: "c2"
        },
        {
          id: expect.any(Number),
          title: "jobC",
          salary: 300000,
          equity: null,
          companyHandle: "c3"
        },
      ],
    });
  });

  test("produces correct results when given ONE filter", async function () {
    let filterQuery = "title=job";
    const resp = await request(app).get(`/jobs?${filterQuery}`);
    expect(resp.body).toEqual({
      jobs: [
        {
          id: expect.any(Number),
          title: "jobA",
          salary: 100000,
          equity: '0.0',
          companyHandle: "c1"
        },
        {
          id: expect.any(Number),
          title: "jobB",
          salary: 200000,
          equity: '0.2',
          companyHandle: "c2"
        },
        {
          id: expect.any(Number),
          title: "jobC",
          salary: 300000,
          equity: null,
          companyHandle: "c3"
        },
      ],
    });
  });

  test("produces correct results when given MANY filters", async function () {
    let filterQuery = "title=job&minSalary=150000";
    const resp = await request(app).get(`/jobs?${filterQuery}`);
    expect(resp.body).toEqual({
      jobs: [
        {
          id: expect.any(Number),
          title: "jobB",
          salary: 200000,
          equity: '0.2',
          companyHandle: "c2"
        },
        {
          id: expect.any(Number),
          title: "jobC",
          salary: 300000,
          equity: null,
          companyHandle: "c3"
        },
      ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
        .get("/jobs")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
  
  test("fails: throws error when equity > 1", async function () {
    // await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
        .get("/jobs?equity=2")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
  //end
});

/************************************** GET /jobs/:id */

// works for anon
// not found for no such job

describe("GET /jobs/:id", function () {
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

  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/${jobC.id}`);
    expect(resp.body).toEqual({
      job: {
        id: jobC.id,
        title: "jobC",
        salary: 300000,
        equity: null,
        companyHandle: "c3"
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/10000`);
    expect(resp.statusCode).toEqual(404);
  });
  //end
});

/************************************** PATCH /jobs/:id */

// works for admin users
// unauth for anon
// unauth for logged in user
// not found on no such company
// bad request on company_handle change attempt
// bad request on invalid data i.e. NaN for minSalary

// NOTE: jsonschema already validates properties that do not exist and .validate
// will signal an error
describe("PATCH /jobs/:id", function () {
  let jobC;

  beforeAll(async function () {
    const jobCResult = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs
            WHERE title = $1`,
      ["jobC"]
    );
    jobC = jobCResult.rows[0];
  });

  test("works for admin users", async function () {
    const resp = await request(app)
        .patch(`/jobs/${jobC.id}`)
        .send({
          salary: 400000
        })
        .set("authorization", `Bearer ${adminToken}`);

    expect(resp.body).toEqual({
      job: {
        id: jobC.id,
        title: "jobC",
        salary: 400000,
        equity: null,
        companyHandle: "c3"
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .patch(`/jobs/${jobC.id}`)
      .send({
        salary: 400000
      });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for logged in user", async function () {
    const resp = await request(app)
      .patch(`/jobs/${jobC.id}`)
      .send({
        salary: 400000
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such company", async function () {
    const resp = await request(app)
      .patch(`/jobs/1000000`)
      .send({
        salary: 400000,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on company_handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/jobs/${jobC.id}`)
      .send({
        company_handle: "c3-new",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/jobs/${jobC.id}`)
      .send({
        salary: "string-instead-of-int-fails",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
  //end
});

/************************************** DELETE /jobs/:id */

// works for admin users
// unauth for anon
// unauth for logged in user
// not found for no such job

describe("DELETE /jobs/:id", function () {
  let jobC;

  beforeAll(async function () {
    const jobCResult = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs
            WHERE title = $1`,
      ["jobC"]
    );
    jobC = jobCResult.rows[0];
  });

  test("works for admin users", async function () {
    const resp = await request(app)
        .delete(`/jobs/${jobC.id}`)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ deleted: `${jobC.id}` });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .delete(`/jobs/${jobC.id}`);
    expect(resp.statusCode).toEqual(401);
  });
  
  test("unauth for logged in user", async function () {
    const resp = await request(app)
      .delete(`/jobs/${jobC.id}`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
        .delete(`/jobs/1000000`)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
  //end
});
