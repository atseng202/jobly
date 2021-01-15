"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const Company = require("../models/company");

const companyNewSchema = require("../schemas/companyNew.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");
const companyFindSchema = require("../schemas/companyFind.json");

const router = new express.Router();


/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: login and admin
 */

router.post("/", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, companyNewSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const company = await Company.create(req.body);
  return res.status(201).json({ company });
});

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 * 
 * throws bad req err if minEmps > maxEmps
 */

router.get("/", async function (req, res, next) {

  let { minEmployees, maxEmployees, name } = req.query;
  let comparedQuery = {};
  if (minEmployees) {
    comparedQuery.minEmployees = parseInt(minEmployees);
  }

  if (maxEmployees) {
    comparedQuery.maxEmployees = parseInt(maxEmployees);
  }

  if (name) {
    comparedQuery.name = name;
  }
  
  // TODO: Add regex to validator to make sure min and maxEmployees are
  // actual integers [0-9], then validate query, and do the same check that
  // min <= max as before
  const validator = jsonschema.validate(comparedQuery, companyFindSchema);
  if (!validator.valid) {
    // throw new BadRequestError("minEmployees must be less than maxEmployees");
    const errs = validator.errors.map((e) => e.stack);
    throw new BadRequestError(errs);  
  }

  if ((minEmployees && maxEmployees) &&
    (parseInt(minEmployees) > parseInt(maxEmployees))) {
      throw new BadRequestError("minEmployees must be less than maxEmployees");
    }
  const companies = await Company.findAll(req.query);
  return res.json({ companies });
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 * 
 */


router.get("/:handle", async function (req, res, next) {
  const company = await Company.get(req.params.handle);
  return res.json({ company });
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: login as admin
 */

router.patch(
  "/:handle",
  ensureLoggedIn,
  ensureAdmin,
  async function (req, res, next) {
    const validator = jsonschema.validate(req.body, companyUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.update(req.params.handle, req.body);
    return res.json({ company });
  }
);

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: login as admin
 */

router.delete(
  "/:handle",
  ensureLoggedIn,
  ensureAdmin,
  async function (req, res, next) {
    await Company.remove(req.params.handle);
    return res.json({ deleted: req.params.handle });
  });


module.exports = router;
