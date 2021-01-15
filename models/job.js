"use strict";

const db = require("../db");
const { NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a Job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   **/

  static async create({ title, salary, equity, companyHandle }) {
    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs matching query filters if provided.
   *
   * building partial WHERE statement based on query params in arg
   * title: case-insensitive jobs that contain title phrase
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   * */

  static async findAll(query) {
    let whereKeys = [];
    let whereValues = [];
    let currentIdx = 1;

    // NOTE: Can also use length of whereValues instead of keeping track of idx
    // Better to be explicit with truthy/falsey values
    if (query.title !== undefined) {
      whereValues.push(`%${query.title}%`);
      whereKeys.push(`title ILIKE $${currentIdx}`);
      currentIdx++;
    }
    if (query.minSalary !== undefined) {
      whereValues.push(query.minSalary);
      whereKeys.push(`salary >= $${currentIdx}`);
      currentIdx++;
    }
    if (query.hasEquity === true) {
      whereValues.push(0);
      whereKeys.push(`equity > $${currentIdx}`);
    }

    // WHERE clause should only be added if there were any query filters
    let whereKeysStr = `WHERE ${whereKeys.join(" AND ")}`;
    if (whereKeys.length === 0) {
      whereKeysStr = "";
    }

    const jobsRes = await db.query(
      `SELECT     id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
            FROM jobs
            ${whereKeysStr}
            ORDER BY title, salary`,
      whereValues
    );
    return jobsRes.rows;
  }

  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
          `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`,
        [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      companyHandle: "company_handle",
    });

    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id,
                                title,
                                salary, 
                                equity,
                                company_handle AS "companyHandle"`;

    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job with id: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
      [id]);
    
    const job = result.rows[0];
    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;
