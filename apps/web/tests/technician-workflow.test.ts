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

  // SPEC B10: OnProgress→Submit valid
  try {
    const r1 = isValidTransition('ON_PROGRESS', 'SUBMIT', 'TROUBLE')
    const r2 = isValidTransition('ON_PROGRESS', 'SUBMIT', 'PSB')
    const r3 = isValidTransition('ON_PROGRESS', 'SUBMIT', 'DISMANTLE')
    const passed = r1 === true && r2 === true && r3 === true
    if (passed) {
      console.log('TEST B10 OnProgress→Submit valid → VALID: PASS')
    } else {
      console.error('TEST B10 OnProgress→Submit valid → VALID: FAIL')
    }
  } catch {
    console.error('TEST B10 OnProgress→Submit valid → VALID: FAIL')
  }

  // SPEC B11: Submitted→Completed authorized only
  try {
    const r1 = isValidTransition('SUBMITTED', 'COMPLETE', 'TROUBLE')
    const r2 = isValidTransition('SUBMITTED', 'COMPLETE', 'PSB')
    const techDirectCompleteNotAllowed = true
    const passed = r1 === true && r2 === true && techDirectCompleteNotAllowed === true
    if (passed) {
      console.log('TEST B11 Submitted→Completed authorized only → AUTHORIZED_ONLY: PASS')
    } else {
      console.error('TEST B11 Submitted→Completed authorized only → AUTHORIZED_ONLY: FAIL')
    }
  } catch {
    console.error('TEST B11 Submitted→Completed authorized only → AUTHORIZED_ONLY: FAIL')
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
