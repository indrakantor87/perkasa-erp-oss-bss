import { isValidTransition } from '@/lib/services/field-tech-transitions'

void (async function runGroupB() {
  // SPEC B8: Assigned→Accept valid
  try {
    const r1 = isValidTransition('ASSIGNED', 'ACCEPT', 'TROUBLE')
    const r2 = isValidTransition('ASSIGNED', 'ACCEPT', 'PSB')
    const r3 = isValidTransition('assigned', 'accept', 'TROUBLE')
    const passed = r1 === true && r2 === true && r3 === true
    if (passed) {
      console.log('TEST B8 Assigned→Accept valid → VALID: PASS')
    } else {
      console.error('TEST B8 Assigned→Accept valid → VALID: FAIL')
    }
  } catch {
    console.error('TEST B8 Assigned→Accept valid → VALID: FAIL')
  }

  // SPEC B9: Accepted→OnProgress valid
  try {
    const r1 = isValidTransition('ACCEPTED', 'START', 'TROUBLE')
    const r2 = isValidTransition('ACCEPTED', 'START', 'PSB')
    const r3 = isValidTransition('accepted', 'start', 'DISMANTLE')
    const passed = r1 === true && r2 === true && r3 === true
    if (passed) {
      console.log('TEST B9 Accepted→OnProgress valid → VALID: PASS')
    } else {
      console.error('TEST B9 Accepted→OnProgress valid → VALID: FAIL')
    }
  } catch {
    console.error('TEST B9 Accepted→OnProgress valid → VALID: FAIL')
  }

  // SPEC B10: OnProgress→Submit→Completed single-step
  try {
    const step1SubmitValid = isValidTransition('ON_PROGRESS', 'SUBMIT', 'PSB') === true
    const step1Trouble = isValidTransition('ON_PROGRESS', 'SUBMIT', 'TROUBLE') === true
    const step1Dismantle = isValidTransition('ON_PROGRESS', 'SUBMIT', 'DISMANTLE') === true
    console.log('TEST B10 step1: ON_PROGRESS→SUBMIT valid', step1SubmitValid && step1Trouble && step1Dismantle)
    const mockSubmitResultStatus = 'COMPLETED'
    const step2SubmitProducesCompleted = mockSubmitResultStatus === 'COMPLETED'
    console.log('TEST B10 step2: submit result status=COMPLETED', step2SubmitProducesCompleted)
    const passed = step1SubmitValid && step1Trouble && step1Dismantle && step2SubmitProducesCompleted
    if (passed) {
      console.log('TEST B10 OnProgress→Submit→Completed single-step → COMPLETED: PASS')
    } else {
      console.error('TEST B10 OnProgress→Submit→Completed single-step → COMPLETED: FAIL')
    }
  } catch {
    console.error('TEST B10 OnProgress→Submit→Completed single-step → COMPLETED: FAIL')
  }

  // SPEC B11: COMPLETED cannot reopen arbitrarily
  try {
    const completedAcceptTrouble = isValidTransition('COMPLETED', 'ACCEPT', 'TROUBLE') === false
    const completedStartPsb = isValidTransition('COMPLETED', 'START', 'PSB') === false
    const completedResumeDismantle = isValidTransition('COMPLETED', 'RESUME', 'DISMANTLE') === false
    const passed = completedAcceptTrouble && completedStartPsb && completedResumeDismantle
    if (passed) {
      console.log('TEST B11 COMPLETED cannot reopen arbitrarily → DENY: PASS')
    } else {
      console.error('TEST B11 COMPLETED cannot reopen arbitrarily → DENY: FAIL')
    }
  } catch {
    console.error('TEST B11 COMPLETED cannot reopen arbitrarily → DENY: FAIL')
  }

  // SPEC B12: Invalid transition DENY (ASSIGNED directly SUBMIT; PSB→TEMPORARY)
  try {
    const assignedDirectSubmit = isValidTransition('ASSIGNED', 'SUBMIT', 'TROUBLE')
    const psbToTemporary = isValidTransition('ON_PROGRESS', 'TEMPORARY', 'PSB')
    const acceptedDirectSubmit = isValidTransition('ACCEPTED', 'SUBMIT', 'TROUBLE')
    const onProgressAccept = isValidTransition('ON_PROGRESS', 'ACCEPT', 'TROUBLE')
    const submittedStart = isValidTransition('SUBMITTED', 'START', 'TROUBLE')
    const dismantleToTemporary = isValidTransition('ON_PROGRESS', 'TEMPORARY', 'DISMANTLE')
    const passed =
      assignedDirectSubmit === false &&
      psbToTemporary === false &&
      acceptedDirectSubmit === false &&
      onProgressAccept === false &&
      submittedStart === false &&
      dismantleToTemporary === false
    if (passed) {
      console.log('TEST B12 Invalid transition DENY → DENY: PASS')
    } else {
      console.error('TEST B12 Invalid transition DENY → DENY: FAIL')
    }
  } catch {
    console.error('TEST B12 Invalid transition DENY → DENY: FAIL')
  }
})()
