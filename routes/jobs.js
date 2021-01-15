"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
// const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobFindSchema = require("../schemas/jobFind.json");

const router = new express.Router();


/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, company_handle }
 *
 * Returns { id, title, salary, equity, company_handle }
 *
 * Authorization required: login and admin
 */

router.post("/",
  ensureLoggedIn,
  ensureAdmin,
  async function (req, res, next) {
    

  const validator = jsonschema.validate(req.body, jobNewSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const job = await Job.create(req.body);
  return res.status(201).json({ job });
  });

/** GET /  =>
 *   { jobs: [ { id, title, salary, equity, company_handle }, ...] }
 *
 * Can filter on provided search filters:
 * - title
 * - minSalary
 * - equity
 *
 * Authorization required: none
 * 
 * throws bad req err if equity > 1 or < 0
 */

router.get("/", async function (req, res, next) {

  let comparedQuery = {...req.query};
  if (comparedQuery.minSalary) {
    comparedQuery.minSalary = parseInt(comparedQuery.minSalary);
  }
  
  const validator = jsonschema.validate(comparedQuery, jobFindSchema);
  if (!validator.valid) {
    const errs = validator.errors.map((e) => e.stack);
    throw new BadRequestError(errs);  
  }

  const jobs = await Job.findAll(comparedQuery);
  return res.json({ jobs });
});

/** GET /[id]  =>  { job }
 *
 *  Job is { id, title, salary, equity, company_handle }
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  const job = await Job.get(req.params.id);
  console.log('job = ', job);
  return res.json({ job });
});


module.exports = router;