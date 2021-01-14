"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");

/** Related functions for jobs. */

class Job {
  /** Create a Job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { title, salary, equity, company_handle }
   *
   **/

  static async create({ title, salary, equity, companyHandle }) {

    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];
    
    return job;
  }

  /** Find all jobs matching query filters if provided.
   * 
   * building partial WHERE statement based on query params in arg
   * title: case-insensitive jobs that contain title phrase
   * Returns [{ title, salary, equity, companyHandle }, ...]
   * */

  static async findAll(query) {
    let whereKeys = [];
    let whereValues = [];
    let currentIdx = 1;
    
    if (query.title) {
      whereValues.push(`%${query.title}%`);
      whereKeys.push(`title ILIKE $${currentIdx}`)
      currentIdx++;
    } 
    if (query.minSalary) {
      whereValues.push(query.minSalary);
      whereKeys.push(`salary >= $${currentIdx}`);
      currentIdx++;
    }
    if (query.hasEquity === true) {
      whereValues.push(0);
      whereKeys.push(`equity > $${currentIdx}`);
    }

    // WHERE clause should only be added if there were any query filters
    let whereKeysStr = `WHERE ${whereKeys.join(' AND ')}`;
    if (whereKeys.length === 0) {
      whereKeysStr = "";
    }

    const jobsRes = await db.query(
          `SELECT title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
            FROM jobs
            ${whereKeysStr}
            ORDER BY title, salary`,
    whereValues);
    return jobsRes.rows;
  }

}



module.exports = Job;