import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Missing environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in a .env file.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEFAULT_STAGES = [
  { name: 'Not Started', position: 0 },
  { name: 'In Progress', position: 1 },
  { name: 'Done', position: 2 },
];

const SAMPLE_TASKS = [
  {
    title: 'Define project goals',
    description: 'Write a short brief outlining objectives and success criteria.',
    stageIndex: 0,
    done: false,
    position: 0,
  },
  {
    title: 'Research competitors',
    description: 'Review similar products and note useful patterns.',
    stageIndex: 0,
    done: false,
    position: 1,
  },
  {
    title: 'Draft wireframes',
    description: 'Sketch the main screens and user flows.',
    stageIndex: 0,
    done: false,
    position: 2,
  },
  {
    title: 'Set up development environment',
    description: 'Install dependencies and verify the local dev server runs.',
    stageIndex: 0,
    done: false,
    position: 3,
  },
  {
    title: 'Build authentication flow',
    description: 'Implement sign-up, login, and session handling.',
    stageIndex: 1,
    done: false,
    position: 0,
  },
  {
    title: 'Design database schema',
    description: 'Model projects, stages, and tasks with relationships.',
    stageIndex: 1,
    done: false,
    position: 1,
  },
  {
    title: 'Implement project listing',
    description: 'Show projects owned by the signed-in user.',
    stageIndex: 1,
    done: false,
    position: 2,
  },
  {
    title: 'Add task drag-and-drop',
    description: 'Allow moving tasks between stages on the board.',
    stageIndex: 1,
    done: false,
    position: 3,
  },
  {
    title: 'Initialize Git repository',
    description: 'Create the repo and push the initial scaffold.',
    stageIndex: 2,
    done: true,
    position: 0,
  },
  {
    title: 'Create project scaffold',
    description: 'Set up Vite, routing, and layout components.',
    stageIndex: 2,
    done: true,
    position: 1,
  },
  {
    title: 'Configure Supabase connection',
    description: 'Connect the app to the database and auth services.',
    stageIndex: 2,
    done: true,
    position: 2,
  },
  {
    title: 'Write seed script',
    description: 'Populate sample projects, stages, and tasks for demo users.',
    stageIndex: 2,
    done: true,
    position: 3,
  },
];

function projectTitleFromEmail(email) {
  const localPart = email?.split('@')[0] ?? 'User';
  const label = localPart.charAt(0).toUpperCase() + localPart.slice(1);
  return `${label}'s Task Board`;
}

async function listUsers() {
  const users = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    users.push(...data.users);

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function userHasProject(ownerId) {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', ownerId)
    .limit(1);

  if (error) {
    throw new Error(`Failed to check projects for ${ownerId}: ${error.message}`);
  }

  return data.length > 0;
}

async function createProjectForUser(user) {
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      title: projectTitleFromEmail(user.email),
      description: 'Sample project with default stages and tasks.',
      owner_id: user.id,
    })
    .select('id, title')
    .single();

  if (error) {
    throw new Error(`Failed to create project for ${user.email}: ${error.message}`);
  }

  return project;
}

async function createStages(projectId) {
  const rows = DEFAULT_STAGES.map((stage) => ({
    project_id: projectId,
    name: stage.name,
    position: stage.position,
  }));

  const { data, error } = await supabase.from('project_stages').insert(rows).select('id, name, position');

  if (error) {
    throw new Error(`Failed to create stages: ${error.message}`);
  }

  return data.sort((a, b) => a.position - b.position);
}

function tasksForUser(userIndex) {
  const taskCount = 10 + (userIndex % 3);
  return SAMPLE_TASKS.slice(0, taskCount);
}

async function createTasks(projectId, stages, userIndex) {
  const tasks = tasksForUser(userIndex).map((task) => ({
    project_id: projectId,
    stage_id: stages[task.stageIndex].id,
    title: task.title,
    description: task.description,
    position: task.position,
    done: task.done,
  }));

  const { error } = await supabase.from('tasks').insert(tasks);

  if (error) {
    throw new Error(`Failed to create tasks: ${error.message}`);
  }

  return tasks.length;
}

async function seed() {
  console.log('Fetching users...');
  const users = await listUsers();

  if (users.length === 0) {
    console.log('No users found in auth.users. Create users first, then run seed again.');
    return;
  }

  console.log(`Found ${users.length} user(s).`);

  let created = 0;
  let skipped = 0;

  for (let index = 0; index < users.length; index += 1) {
    const user = users[index];
    const email = user.email ?? user.id;

    if (await userHasProject(user.id)) {
      console.log(`Skipping ${email} — project already exists.`);
      skipped += 1;
      continue;
    }

    console.log(`Seeding project for ${email}...`);

    const project = await createProjectForUser(user);
    const stages = await createStages(project.id);
    const taskCount = await createTasks(project.id, stages, index);

    console.log(
      `  Created "${project.title}" with ${stages.length} stages and ${taskCount} tasks.`
    );
    created += 1;
  }

  console.log(`Done. Created ${created} project(s), skipped ${skipped}.`);
}

seed().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
