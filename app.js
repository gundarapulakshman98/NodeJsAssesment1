const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { format, compareAsc, isValid } = require("date-fns");
const app = express();
app.use(express.json());

let dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server started on port: 3000 \n http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB ERROR : ${e.message}`);
  }
};

initializeDbAndServer();

const isValidStatus = (status) => {
  const actualStatus = ["TO DO", "IN PROGRESS", "DONE"];
  const atLeastThere = actualStatus.some((eachItem) => eachItem === status);
  return atLeastThere;
};

const isValidPriority = (priority) => {
  const actualStatus = ["LOW", "HIGH", "MEDIUM"];
  const atLeastThere = actualStatus.some((eachItem) => eachItem === priority);
  return atLeastThere;
};

const isValidCategory = (category) => {
  const actualStatus = ["WORK", "HOME", "LEARNING"];
  const atLeastThere = actualStatus.some((eachItem) => eachItem === category);
  return atLeastThere;
};

const isValidDate = (dueDate) => {
  console.log(typeof dueDate);
  const dateSplit = dueDate.split("-");
  let year = dateSplit[0];
  let month = parseInt(dateSplit[1]);
  let day = parseInt(dateSplit[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return {
      isValid: false,
      newDate: format(new Date(year, month - 1, day), "yyyy-MM-dd"),
    };
  }
  if (month === 2 && day > 29) {
    return {
      isValid: false,
      newDate: format(new Date(year, month - 1, day), "yyyy-MM-dd"),
    };
  }
  const newDate = new Date(year, month - 1, day);
  console.log(newDate);
  return {
    isValid: isValid(newDate),
    newDate: format(newDate, "yyyy-MM-dd"),
  };
};

// console.log(isValidDate(2021 - 15 - 22));

// console.log(isValidDate("2021-02-22"));//

const convertObject = (eachItem) => {
  return {
    id: eachItem.id,
    todo: eachItem.todo,
    priority: eachItem.priority,
    status: eachItem.status,
    category: eachItem.category,
    dueDate: eachItem.due_date,
  };
};

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  try {
    const isThere = `select * from todo where id = ${todoId};`;
    const getId = await db.get(isThere);
    console.log(getId);
    if (getId.todo !== undefined) {
      const deleteTodoId = `delete from todo where id = ${todoId};`;
      await db.run(deleteTodoId);
      response.send("Todo Deleted");
    } else {
      response.status(400);
      response.send(`Invalid Todo Id`);
    }
  } catch (e) {
    response.status(400);
    response.send(`DB ERROR: ${e.message}`);
  }
});

app.get("/todos/", async (request, response) => {
  let { search_q = "", status, priority, category } = request.query;
  let query = "";
  let column = "";
  try {
    switch (true) {
      case priority !== undefined && status !== undefined:
        column = "Status";
        query = `select * from todo where (status = '${status}' and priority = '${priority}') and todo like '%${search_q}%';`;
        if (isValidStatus(status) === false) {
          response.status(400);
          response.send("Invalid Todo Status");
        }
        if (isValidPriority(priority) === false) {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
        break;
      case category !== undefined && status !== undefined:
        column = "Status";
        query = `select * from todo where (status = '${status}' and category = '${category}') and todo like '%${search_q}%';`;
        if (isValidStatus(status) === false) {
          response.status(400);
          response.send("Invalid Todo Status");
        }
        if (isValidCategory(category) === false) {
          response.status(400);
          response.send("Invalid Todo Category");
        }
        break;
      case category !== undefined && priority !== undefined:
        column = "Status";
        query = `select * from todo where (priority = '${priority}' and category = '${category}') and todo like '%${search_q}%';`;
        if (isValidCategory(category) === false) {
          response.status(400);
          response.send("Invalid Todo Category");
        }
        if (isValidPriority(priority) === false) {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
        break;
      case status !== undefined:
        column = "Status";
        query = `select * from todo where status = '${status}' and todo like '%${search_q}%';`;
        if (isValidStatus(status) === false) {
          response.status(400);
          response.send("Invalid Todo Status");
        }
        break;
      case priority !== undefined:
        column = "Priority";
        query = `select * from todo where priority = '${priority}' and todo like '%${search_q}%';`;
        if (isValidPriority(priority) === false) {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
        break;
      case category !== undefined:
        column = "Category";
        query = `select * from todo where category = '${category}' and todo like '%${search_q}%';`;
        if (isValidCategory(category) === false) {
          response.status(400);
          response.send("'Invalid Todo Category");
        }
        break;
      default:
        column = "Todo";
        query = `select * from todo where todo like '%${search_q}%';`;
        break;
    }

    const getData = await db.all(query);
    response.send(getData.map((eachItem) => convertObject(eachItem)));
  } catch (e) {
    response.status(400);
    response.send(`DB ERROR: ${e.message}`);
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  try {
    const getDataWithTodoId = `select * from todo where id = ${todoId};`;
    const todoIdDetails = await db.get(getDataWithTodoId);
    console.log(todoIdDetails);
    response.send(convertObject(todoIdDetails));
  } catch (e) {
    response.status(400);
    response.send(`DB ERROR: ${e.message}`);
  }
});

app.get("/agenda/", async (request, response) => {
  let { date } = request.query;
  try {
    let { isValid, newDate } = isValidDate(date);
    if (isValid) {
      console.log(newDate);
      const getDetailsQuery = `select * from todo where due_date = '${newDate}';`;
      const dueDateDetails = await db.all(getDetailsQuery);
      //   console.log(dueDateDetails);
      response.send(dueDateDetails.map((eachItem) => convertObject(eachItem)));
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } catch (e) {
    response.status(400);
    response.send(`Invalid Due Date`);
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  const { isValid, newDate } = isValidDate(dueDate);
  let postQuery = "";
  try {
    switch (true) {
      case isValidStatus(status) !== true:
        response.status(400);
        response.send("Invalid Todo Status");
        break;
      case isValidPriority(priority) !== true:
        response.status(400);
        response.send("Invalid Todo Priority");
        break;
      case isValidCategory(category) !== true:
        response.status(400);
        response.send("Invalid Todo Category");
        break;
      case isValid === false:
        response.status(400);
        response.send("Invalid Due Date");
        break;
      default:
        postQuery = `
            insert into todo (id , todo , priority , status , category , due_date)
            values ('${id}' ,'${todo}' , '${priority}' , '${status}' , '${category}' , '${newDate}')
            ;`;
        await db.run(postQuery);
        response.send(`Todo Successfully Added`);
        break;
    }
  } catch (e) {
    response.status(400);
    response.send(`Invalid Due Date`);
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let putQuery = "";
  let column = "";
  const { status, todo, priority, category, dueDate } = request.body;
  try {
    switch (true) {
      case status !== undefined:
        putQuery = `
                update todo
                set status = '${status}'
                where id = ${todoId}
                ;`;
        column = "Status";
        if (isValidStatus(status) === false) {
          response.status(400);
          response.send(`Invalid Todo ${column}`);
        }
        break;
      case todo !== undefined:
        putQuery = `
                update todo
                set todo = '${todo}'
                where id = ${todoId}
                ;`;
        column = "Todo";
        break;
      case priority !== undefined:
        putQuery = `
                update todo
                set priority = '${priority}'
                where id = ${todoId}
                ;`;
        column = "Priority";
        if (isValidPriority(priority) !== true) {
          response.status(400);
          response.send(`Invalid Todo ${column}`);
        }
        break;
      case category !== undefined:
        putQuery = `
                update todo
                set category = '${category}'
                where id = ${todoId}
                ;`;
        column = "Category";
        if (isValidCategory(category) !== true) {
          response.status(400);
          response.send(`Invalid Todo ${column}`);
        }
        break;
      case dueDate !== undefined:
        putQuery = `
                update todo
                set due_date = '${dueDate}'
                where id = ${todoId}
                ;`;
        column = "Due Date";
        const { isValid, newDate } = isValidDate(dueDate);
        if (isValid === false) {
          response.status(400);
          response.send(`Invalid Due Date`);
        }
        break;
    }
    await db.run(putQuery);
    response.send(`${column} Updated`);
  } catch (e) {
    response.status(400);
    response.send(`Invalid Due Date`);
  }
});

module.exports = app;
