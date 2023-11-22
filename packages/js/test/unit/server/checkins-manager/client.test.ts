import { CheckInsClient } from '../../../../src/server/check-ins-manager/client';
import { CheckIn } from '../../../../src/server/check-ins-manager/check-in';
import { nullLogger } from '../../helpers';
import nock from 'nock';
import { ServerTransport } from '../../../../src/server/transport';

describe('CheckinsClient', () => {
  it('should create a client', () => {
    const client = new CheckInsClient({
      logger: nullLogger(),
      personalAuthToken: '123',
    }, new ServerTransport())
    expect(client).toBeInstanceOf(CheckInsClient)
  })

  it('should list check-ins for a project', async () => {
    const projectId = '11111'
    const request = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins`)
      .reply(200, {
        results: [
          {
            id: 'uuid',
            name: 'a check-in',
            schedule_type: 'simple',
            report_period: '1 week',
          }
        ]
      })
    const client = new CheckInsClient({
      logger: nullLogger(),
      personalAuthToken: '123',
    }, new ServerTransport())
    const checkIns = await client.listForProject(projectId)
    expect(request.isDone()).toBe(true)
    expect(checkIns).toHaveLength(1)
    expect(checkIns[0].id).toEqual('uuid')
    expect(checkIns[0].name).toEqual('a check-in')
    expect(checkIns[0].scheduleType).toEqual('simple')
    expect(checkIns[0].reportPeriod).toEqual('1 week')
  })

  it('should return list of check-ins from cache for the same project', async () => {
    const projectId = '11111'
    const request = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins`)
      .once()
      .reply(200, {
        results: [
          {
            id: 'uuid',
            name: 'a check-in',
            schedule_type: 'simple',
            report_period: '1 week',
          }
        ]
      })
    const client = new CheckInsClient({
      logger: nullLogger(),
      personalAuthToken: '123',
    }, new ServerTransport())
    const checkIns = await client.listForProject(projectId)
    const checkInsAgain = await client.listForProject(projectId)
    expect(checkIns).toEqual(checkInsAgain);
    expect(request.isDone()).toBe(true)
  })

  it('should get a check-in', async () => {
    const projectId = '11111'
    const checkInId = '22222'

    const request = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins/${checkInId}`)
      .once()
      .reply(200, {
        id: 'uuid',
        name: 'a check-in',
        schedule_type: 'simple',
        report_period: '1 week',
      })
    const client = new CheckInsClient({
      logger: nullLogger(),
      personalAuthToken: '123',
    }, new ServerTransport())
    const checkIn = await client.get(projectId, checkInId)
    expect(request.isDone()).toBe(true)
    expect(checkIn.id).toEqual('uuid')
    expect(checkIn.name).toEqual('a check-in')
    expect(checkIn.scheduleType).toEqual('simple')
    expect(checkIn.reportPeriod).toEqual('1 week')
  })

  it('should create a check-in', async () => {
    const projectId = '11111'
    const checkInId = '22222'

    const checkInToBeSaved = new CheckIn({
      projectId,
      name: 'a check-in',
      scheduleType: 'simple',
      reportPeriod: '1 week',
    })

    const payload = checkInToBeSaved.asRequestPayload()
    const request = nock('https://app.honeybadger.io')
      .post(`/v2/projects/${projectId}/check_ins`, { check_in: payload })
      .once()
      .reply(201, {
        id: checkInId,
        ...payload,
      })
    const client = new CheckInsClient({
      logger: nullLogger(),
      personalAuthToken: '123',
    }, new ServerTransport())
    const checkIn = await client.create(checkInToBeSaved)
    expect(request.isDone()).toBe(true)
    expect(checkIn.id).toEqual(checkInId)
    expect(checkIn.name).toEqual('a check-in')
    expect(checkIn.scheduleType).toEqual('simple')
    expect(checkIn.reportPeriod).toEqual('1 week')
  })

  it('should update a check-in', async () => {
    const projectId = '11111'
    const checkInId = '22222'

    const checkInToBeUpdated = new CheckIn({
      projectId,
      id: checkInId,
      name: 'a check-in',
      scheduleType: 'simple',
      reportPeriod: '1 week',
    })

    const payload = checkInToBeUpdated.asRequestPayload()
    const request = nock('https://app.honeybadger.io')
      .put(`/v2/projects/${projectId}/check_ins/${checkInId}`, { check_in: payload })
      .once()
      .reply(204, {
        id: checkInId,
        ...payload,
      })
    const client = new CheckInsClient({
      logger: nullLogger(),
      personalAuthToken: '123',
    }, new ServerTransport())
    const checkIn = await client.update(checkInToBeUpdated)
    expect(request.isDone()).toBe(true)
    expect(checkIn.id).toEqual(checkInId)
    expect(checkIn.name).toEqual('a check-in')
    expect(checkIn.scheduleType).toEqual('simple')
    expect(checkIn.reportPeriod).toEqual('1 week')
  })

  it('should remove a checkin', async () => {
    const projectId = '11111'
    const checkInId = '22222'

    const checkInToBeRemoved = new CheckIn({
      projectId,
      id: checkInId,
      name: 'a check-in',
      scheduleType: 'simple',
      reportPeriod: '1 week',
    })

    const request = nock('https://app.honeybadger.io')
      .delete(`/v2/projects/${projectId}/check_ins/${checkInId}`)
      .once()
      .reply(204)

    const client = new CheckInsClient({
      logger: nullLogger(),
      personalAuthToken: '123',
    }, new ServerTransport())

    await client.remove(checkInToBeRemoved)
    expect(request.isDone()).toBe(true)
  })
})
